import { Hono } from 'hono';
import { z } from 'zod';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { leaderboardEntries, profiles } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { validateScore } from '../services/anticheat';

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

const submitSchema = z.object({
  score: z.number().int().min(0),
  difficulty: z.enum(['normal', 'hard', 'expert']),
  waveReached: z.number().int().min(1).max(10),
  towersBuilt: z.number().int().min(0).optional(),
  enemiesKilled: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
});

const leaderboardRoutes = new Hono<Env>();

// GET /api/leaderboard - Public leaderboard
leaderboardRoutes.get('/', async (c) => {
  const difficulty = c.req.query('difficulty') || 'normal';
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const db = getDb(c.env.DATABASE_URL);

  const entries = await db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.difficulty, difficulty))
    .orderBy(desc(leaderboardEntries.score))
    .limit(limit)
    .offset(offset);

  return c.json({
    entries: entries.map((e, i) => ({
      rank: offset + i + 1,
      displayName: e.displayName,
      score: e.score,
      waveReached: e.waveReached,
      towersBuilt: e.towersBuilt,
      enemiesKilled: e.enemiesKilled,
      durationSeconds: e.durationSeconds,
      createdAt: e.createdAt,
    })),
    difficulty,
    limit,
    offset,
  });
});

// GET /api/leaderboard/me - My rank and nearby entries
leaderboardRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const difficulty = c.req.query('difficulty') || 'normal';
  const db = getDb(c.env.DATABASE_URL);

  // Get user's best score
  const myBest = await db
    .select()
    .from(leaderboardEntries)
    .where(and(
      eq(leaderboardEntries.userId, user.id),
      eq(leaderboardEntries.difficulty, difficulty),
    ))
    .orderBy(desc(leaderboardEntries.score))
    .limit(1);

  if (myBest.length === 0) {
    return c.json({ rank: null, entry: null, nearby: [] });
  }

  const myScore = myBest[0].score;

  // Count entries with higher score to get rank
  const rankResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaderboardEntries)
    .where(and(
      eq(leaderboardEntries.difficulty, difficulty),
      sql`${leaderboardEntries.score} > ${myScore}`,
    ));

  const rank = Number(rankResult[0].count) + 1;

  // Get nearby entries (5 above, 5 below)
  const nearbyAbove = await db
    .select()
    .from(leaderboardEntries)
    .where(and(
      eq(leaderboardEntries.difficulty, difficulty),
      sql`${leaderboardEntries.score} > ${myScore}`,
    ))
    .orderBy(leaderboardEntries.score)
    .limit(5);

  const nearbyBelow = await db
    .select()
    .from(leaderboardEntries)
    .where(and(
      eq(leaderboardEntries.difficulty, difficulty),
      sql`${leaderboardEntries.score} < ${myScore}`,
    ))
    .orderBy(desc(leaderboardEntries.score))
    .limit(5);

  return c.json({
    rank,
    entry: myBest[0],
    nearby: [...nearbyAbove.reverse(), myBest[0], ...nearbyBelow],
  });
});

// POST /api/leaderboard - Submit score
leaderboardRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid data', details: parsed.error.issues }, 400);
  }

  // Anti-cheat validation
  const validation = validateScore(parsed.data);
  if (!validation.valid) {
    return c.json({ error: 'Score rejected', reason: validation.reason }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  // Get user's display name from profile or use auth name
  let displayName = user.name;
  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (profile.length > 0) {
    displayName = profile[0].displayName;
  }

  const [entry] = await db
    .insert(leaderboardEntries)
    .values({
      userId: user.id,
      displayName,
      score: parsed.data.score,
      difficulty: parsed.data.difficulty,
      waveReached: parsed.data.waveReached,
      towersBuilt: parsed.data.towersBuilt || 0,
      enemiesKilled: parsed.data.enemiesKilled || 0,
      durationSeconds: parsed.data.durationSeconds,
    })
    .returning();

  return c.json({ success: true, entry }, 201);
});

export { leaderboardRoutes };
