import { Hono } from 'hono';
import { z } from 'zod';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { leaderboardEntries, profiles, pendingScores } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { validateScore } from '../services/anticheat';
import { movePendingScoresToLeaderboard } from '../services/pending-scores';

type Env = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    RESEND_API_KEY?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    ASSETS: Fetcher;
  };
  Variables: {
    user: { id: string; name: string; email: string; emailVerified: boolean };
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
      userId: e.userId,
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

// POST /api/leaderboard - Submit score (verified = leaderboard, unverified = pending)
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

  const scoreData = {
    userId: user.id,
    displayName,
    score: parsed.data.score,
    difficulty: parsed.data.difficulty,
    waveReached: parsed.data.waveReached,
    towersBuilt: parsed.data.towersBuilt || 0,
    enemiesKilled: parsed.data.enemiesKilled || 0,
    durationSeconds: parsed.data.durationSeconds,
  };

  // If email is verified, submit directly to leaderboard
  if (user.emailVerified) {
    const [entry] = await db
      .insert(leaderboardEntries)
      .values(scoreData)
      .returning();

    return c.json({ success: true, entry }, 201);
  }

  // Otherwise, store in pending scores (will be moved on verification)
  const [pending] = await db
    .insert(pendingScores)
    .values(scoreData)
    .returning();

  return c.json({
    success: true,
    pending: true,
    message: 'Score saved! Verify your email to appear on the leaderboard.',
    entry: pending
  }, 201);
});

// GET /api/leaderboard/pending - Get user's pending scores count
leaderboardRoutes.get('/pending', requireAuth, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  const pending = await db
    .select({ count: sql<number>`count(*)` })
    .from(pendingScores)
    .where(eq(pendingScores.userId, user.id));

  return c.json({
    count: Number(pending[0].count),
    emailVerified: user.emailVerified
  });
});

// POST /api/leaderboard/process-pending - Move pending scores to leaderboard after email verification
leaderboardRoutes.post('/process-pending', requireAuth, async (c) => {
  const user = c.get('user');

  // Must be verified to process pending scores
  if (!user.emailVerified) {
    return c.json({
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED'
    }, 403);
  }

  // Move pending scores to leaderboard
  const movedCount = await movePendingScoresToLeaderboard(
    c.env.DATABASE_URL,
    user.id
  );

  return c.json({
    success: true,
    movedCount,
    message: movedCount > 0
      ? `${movedCount} score${movedCount > 1 ? 's' : ''} added to the leaderboard!`
      : 'No pending scores to process.'
  });
});

export { leaderboardRoutes };
