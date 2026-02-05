import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { progression } from '../db/schema';
import { requireAuth } from '../middleware/auth';

type Env = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    ASSETS: Fetcher;
  };
  Variables: {
    user: { id: string; name: string; email: string };
  };
};

const progressionSchema = z.object({
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  skillPoints: z.number().int().min(0),
  upgrades: z.record(z.unknown()),
});

const syncSchema = z.object({
  localData: z.object({
    xp: z.number().int().min(0),
    level: z.number().int().min(1),
    skillPoints: z.number().int().min(0),
    upgrades: z.record(z.unknown()),
    highScore: z.number().int().min(0).optional(),
    achievements: z.array(z.string()).optional(),
  }),
});

const progressionRoutes = new Hono<Env>();

// GET /api/progression - Get current progression
progressionRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  const result = await db
    .select()
    .from(progression)
    .where(eq(progression.userId, user.id))
    .limit(1);

  if (result.length === 0) {
    return c.json({
      xp: 0,
      level: 1,
      skillPoints: 0,
      upgrades: {},
    });
  }

  return c.json({
    xp: result[0].xp,
    level: result[0].level,
    skillPoints: result[0].skillPoints,
    upgrades: result[0].upgrades,
  });
});

// PUT /api/progression - Save progression
progressionRoutes.put('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = progressionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid data', details: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  await db
    .insert(progression)
    .values({
      userId: user.id,
      xp: parsed.data.xp,
      level: parsed.data.level,
      skillPoints: parsed.data.skillPoints,
      upgrades: parsed.data.upgrades,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: progression.userId,
      set: {
        xp: parsed.data.xp,
        level: parsed.data.level,
        skillPoints: parsed.data.skillPoints,
        upgrades: parsed.data.upgrades,
        updatedAt: new Date(),
      },
    });

  return c.json({ success: true });
});

// POST /api/progression/sync - Merge local data with server data
progressionRoutes.post('/sync', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = syncSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid data', details: parsed.error.issues }, 400);
  }

  const local = parsed.data.localData;
  const db = getDb(c.env.DATABASE_URL);

  // Get server state
  const serverData = await db
    .select()
    .from(progression)
    .where(eq(progression.userId, user.id))
    .limit(1);

  // Merge: take higher level/XP, union upgrades (higher level for each)
  let merged;
  if (serverData.length === 0) {
    // No server data — use local
    merged = {
      xp: local.xp,
      level: local.level,
      skillPoints: local.skillPoints,
      upgrades: local.upgrades,
    };
  } else {
    const server = serverData[0];
    const serverUpgrades = (server.upgrades || {}) as Record<string, number>;
    const localUpgrades = (local.upgrades || {}) as Record<string, number>;

    // Merge upgrades: take max of each
    const mergedUpgrades: Record<string, number> = { ...serverUpgrades };
    for (const key of Object.keys(localUpgrades)) {
      mergedUpgrades[key] = Math.max(mergedUpgrades[key] || 0, localUpgrades[key] || 0);
    }

    merged = {
      xp: Math.max(local.xp, server.xp || 0),
      level: Math.max(local.level, server.level || 0),
      skillPoints: Math.max(local.skillPoints, server.skillPoints || 0),
      upgrades: mergedUpgrades,
    };
  }

  // Save merged data
  await db
    .insert(progression)
    .values({
      userId: user.id,
      xp: merged.xp,
      level: merged.level,
      skillPoints: merged.skillPoints,
      upgrades: merged.upgrades,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: progression.userId,
      set: {
        xp: merged.xp,
        level: merged.level,
        skillPoints: merged.skillPoints,
        upgrades: merged.upgrades,
        updatedAt: new Date(),
      },
    });

  return c.json({ success: true, data: merged });
});

export { progressionRoutes };
