import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { gameSaves } from '../db/schema';
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

const saveSchema = z.object({
  saveName: z.string().max(50).optional(),
  difficulty: z.enum(['normal', 'hard', 'expert']),
  gold: z.number().int().min(0),
  lives: z.number().int().min(0),
  score: z.number().int().min(0),
  currentWave: z.number().int().min(1).max(10),
  inventory: z.record(z.unknown()).optional(),
  towers: z.array(z.record(z.unknown())).optional(),
});

const savesRoutes = new Hono<Env>();

// GET /api/saves - Get all save slots
savesRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  const saves = await db
    .select()
    .from(gameSaves)
    .where(eq(gameSaves.userId, user.id))
    .orderBy(gameSaves.slot);

  // Return all 3 slots (null if empty)
  const slots = [null, null, null] as (typeof saves[number] | null)[];
  for (const save of saves) {
    if (save.slot >= 0 && save.slot < 3) {
      slots[save.slot] = save;
    }
  }

  return c.json({ saves: slots });
});

// PUT /api/saves/:slot - Save to a slot
savesRoutes.put('/:slot', requireAuth, async (c) => {
  const user = c.get('user');
  const slot = parseInt(c.req.param('slot'));

  if (isNaN(slot) || slot < 0 || slot > 2) {
    return c.json({ error: 'Invalid slot (0-2)' }, 400);
  }

  const body = await c.req.json();
  const parsed = saveSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid save data', details: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  // Upsert: insert or update on conflict
  const [save] = await db
    .insert(gameSaves)
    .values({
      userId: user.id,
      slot,
      saveName: parsed.data.saveName || `Save ${slot + 1}`,
      difficulty: parsed.data.difficulty,
      gold: parsed.data.gold,
      lives: parsed.data.lives,
      score: parsed.data.score,
      currentWave: parsed.data.currentWave,
      inventory: parsed.data.inventory || {},
      towers: parsed.data.towers || [],
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [gameSaves.userId, gameSaves.slot],
      set: {
        saveName: parsed.data.saveName || `Save ${slot + 1}`,
        difficulty: parsed.data.difficulty,
        gold: parsed.data.gold,
        lives: parsed.data.lives,
        score: parsed.data.score,
        currentWave: parsed.data.currentWave,
        inventory: parsed.data.inventory || {},
        towers: parsed.data.towers || [],
        updatedAt: new Date(),
      },
    })
    .returning();

  return c.json({ success: true, save });
});

// DELETE /api/saves/:slot - Delete a save slot
savesRoutes.delete('/:slot', requireAuth, async (c) => {
  const user = c.get('user');
  const slot = parseInt(c.req.param('slot'));

  if (isNaN(slot) || slot < 0 || slot > 2) {
    return c.json({ error: 'Invalid slot (0-2)' }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  await db
    .delete(gameSaves)
    .where(and(
      eq(gameSaves.userId, user.id),
      eq(gameSaves.slot, slot),
    ));

  return c.json({ success: true });
});

export { savesRoutes };
