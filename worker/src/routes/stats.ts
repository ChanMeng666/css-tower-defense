import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql, and, desc } from 'drizzle-orm';
import { getDb } from '../db';
import { gameHistory, profiles, achievements } from '../db/schema';
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

const gameDataSchema = z.object({
  difficulty: z.enum(['normal', 'hard', 'expert']),
  score: z.number().int().min(0),
  waveReached: z.number().int().min(1).max(10),
  outcome: z.enum(['victory', 'defeat']),
  durationSeconds: z.number().int().min(0).optional(),
  towersBuilt: z.number().int().min(0).optional(),
  enemiesKilled: z.number().int().min(0).optional(),
  goldEarned: z.number().int().min(0).optional(),
});

const achievementSchema = z.object({
  achievementId: z.string().min(1).max(30),
});

const statsRoutes = new Hono<Env>();

// POST /api/stats/game - Record a completed game
statsRoutes.post('/game', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = gameDataSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid data', details: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  // Record game
  await db.insert(gameHistory).values({
    userId: user.id,
    difficulty: parsed.data.difficulty,
    score: parsed.data.score,
    waveReached: parsed.data.waveReached,
    outcome: parsed.data.outcome,
    durationSeconds: parsed.data.durationSeconds,
    towersBuilt: parsed.data.towersBuilt || 0,
    enemiesKilled: parsed.data.enemiesKilled || 0,
  });

  // Update profile stats
  await db
    .insert(profiles)
    .values({
      userId: user.id,
      displayName: user.name,
      totalGamesPlayed: 1,
      totalEnemiesKilled: parsed.data.enemiesKilled || 0,
      totalGoldEarned: parsed.data.goldEarned || 0,
      totalPlayTimeSeconds: parsed.data.durationSeconds || 0,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        totalGamesPlayed: sql`${profiles.totalGamesPlayed} + 1`,
        totalEnemiesKilled: sql`${profiles.totalEnemiesKilled} + ${parsed.data.enemiesKilled || 0}`,
        totalGoldEarned: sql`${profiles.totalGoldEarned} + ${parsed.data.goldEarned || 0}`,
        totalPlayTimeSeconds: sql`${profiles.totalPlayTimeSeconds} + ${parsed.data.durationSeconds || 0}`,
      },
    });

  return c.json({ success: true });
});

// GET /api/stats/me - Get my stats
statsRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  // Get profile
  const profile = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  // Get game history aggregates
  const games = await db
    .select({
      totalGames: sql<number>`count(*)`,
      wins: sql<number>`count(*) filter (where ${gameHistory.outcome} = 'victory')`,
      avgScore: sql<number>`coalesce(avg(${gameHistory.score}), 0)`,
      maxScore: sql<number>`coalesce(max(${gameHistory.score}), 0)`,
      totalPlayTime: sql<number>`coalesce(sum(${gameHistory.durationSeconds}), 0)`,
    })
    .from(gameHistory)
    .where(eq(gameHistory.userId, user.id));

  // Get recent games
  const recentGames = await db
    .select()
    .from(gameHistory)
    .where(eq(gameHistory.userId, user.id))
    .orderBy(desc(gameHistory.playedAt))
    .limit(10);

  const stats = games[0];
  const totalGames = Number(stats.totalGames);
  const wins = Number(stats.wins);

  return c.json({
    profile: profile[0] || null,
    stats: {
      totalGames,
      wins,
      losses: totalGames - wins,
      winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
      avgScore: Math.round(Number(stats.avgScore)),
      maxScore: Number(stats.maxScore),
      totalPlayTime: Number(stats.totalPlayTime),
    },
    recentGames,
  });
});

// POST /api/achievements - Unlock an achievement
statsRoutes.post('/achievements', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = achievementSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid data' }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  // Insert if not already unlocked (unique constraint handles duplicates)
  try {
    await db.insert(achievements).values({
      userId: user.id,
      achievementId: parsed.data.achievementId,
    });
    return c.json({ success: true, new: true });
  } catch (e: any) {
    // Unique constraint violation = already unlocked
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      return c.json({ success: true, new: false });
    }
    throw e;
  }
});

// GET /api/achievements - Get my achievements
statsRoutes.get('/achievements', requireAuth, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  const result = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, user.id));

  return c.json({
    achievements: result.map(a => ({
      achievementId: a.achievementId,
      unlockedAt: a.unlockedAt,
    })),
  });
});

// GET /api/achievements/global - Global achievement percentages
statsRoutes.get('/achievements/global', async (c) => {
  const db = getDb(c.env.DATABASE_URL);

  const totalUsers = await db
    .select({ count: sql<number>`count(distinct ${achievements.userId})` })
    .from(achievements);

  const total = Number(totalUsers[0].count) || 1;

  const perAchievement = await db
    .select({
      achievementId: achievements.achievementId,
      count: sql<number>`count(*)`,
    })
    .from(achievements)
    .groupBy(achievements.achievementId);

  const percentages: Record<string, number> = {};
  for (const a of perAchievement) {
    percentages[a.achievementId] = Math.round((Number(a.count) / total) * 100);
  }

  return c.json({ percentages, totalPlayers: total });
});

export { statsRoutes };
