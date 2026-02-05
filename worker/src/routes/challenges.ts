import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { dailyChallengeCompletions, profiles } from '../db/schema';
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

// Challenge templates
const CHALLENGE_TEMPLATES = [
  { id: 'speed_run', name: 'Speed Run', description: 'Complete in under 15 minutes', constraint: 'time_limit', bonusFormula: 'time' },
  { id: 'arrow_only', name: "Archer's Path", description: 'Arrow towers only', constraint: 'tower_restrict', allowedTowers: ['arrow'], scoreBonus: 1.5 },
  { id: 'no_sell', name: 'No Refunds', description: 'Cannot sell towers', constraint: 'no_sell', scoreBonus: 1.25 },
  { id: 'budget', name: 'Penny Pincher', description: 'Start with only 50 gold', constraint: 'start_gold', startGold: 50, scoreBonus: 2.0 },
  { id: 'fragile', name: 'Glass Cannon', description: 'Only 5 starting lives', constraint: 'start_lives', startLives: 5, bonusFormula: 'lives' },
  { id: 'boss_rush', name: 'Boss Rush', description: 'Start at wave 8 with 500 gold', constraint: 'start_wave', startWave: 8, startGold: 500, scoreBonus: 2.0 },
  { id: 'ice_age', name: 'Ice Age', description: 'Arrow and Ice towers only', constraint: 'tower_restrict', allowedTowers: ['arrow', 'ice'], scoreBonus: 1.75 },
  { id: 'material_hunter', name: 'Scavenger', description: 'Score based on materials collected', constraint: 'material_score', bonusFormula: 'materials' },
  { id: 'combo_master', name: 'Combo Frenzy', description: 'Bonus for combos of 5+', constraint: 'combo_bonus', bonusFormula: 'combos' },
  { id: 'tower_limit', name: 'Minimalist', description: 'Maximum 6 towers', constraint: 'tower_limit', maxTowers: 6, scoreBonus: 2.5 },
];

/**
 * Deterministically pick today's challenge from date string
 */
function getDailyChallenge(dateStr: string) {
  // Simple hash of date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CHALLENGE_TEMPLATES.length;
  return CHALLENGE_TEMPLATES[index];
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

const completeSchema = z.object({
  score: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

const challengeRoutes = new Hono<Env>();

// GET /api/challenges/today - Today's challenge + top scores
challengeRoutes.get('/today', async (c) => {
  const dateStr = getTodayStr();
  const challenge = getDailyChallenge(dateStr);
  const db = getDb(c.env.DATABASE_URL);

  // Get top 10 scores for today
  const topScores = await db
    .select()
    .from(dailyChallengeCompletions)
    .where(eq(dailyChallengeCompletions.challengeDate, dateStr))
    .orderBy(desc(dailyChallengeCompletions.score))
    .limit(10);

  // Get display names
  const entries = [];
  for (const entry of topScores) {
    const profile = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.userId, entry.userId))
      .limit(1);

    entries.push({
      displayName: profile[0]?.displayName || 'Player',
      score: entry.score,
      durationSeconds: entry.durationSeconds,
    });
  }

  return c.json({
    date: dateStr,
    challenge,
    topScores: entries,
  });
});

// POST /api/challenges/complete - Submit completion
challengeRoutes.post('/complete', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = completeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid data', details: parsed.error.issues }, 400);
  }

  const dateStr = getTodayStr();
  const challenge = getDailyChallenge(dateStr);
  const db = getDb(c.env.DATABASE_URL);

  try {
    const [entry] = await db
      .insert(dailyChallengeCompletions)
      .values({
        userId: user.id,
        challengeDate: dateStr,
        templateId: challenge.id,
        score: parsed.data.score,
        durationSeconds: parsed.data.durationSeconds,
        metadata: parsed.data.metadata || {},
      })
      .returning();

    return c.json({ success: true, entry }, 201);
  } catch (e: any) {
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      return c.json({ error: 'Already completed today\'s challenge' }, 409);
    }
    throw e;
  }
});

// GET /api/challenges/leaderboard - Full leaderboard by date
challengeRoutes.get('/leaderboard', async (c) => {
  const dateStr = c.req.query('date') || getTodayStr();
  const db = getDb(c.env.DATABASE_URL);

  const entries = await db
    .select()
    .from(dailyChallengeCompletions)
    .where(eq(dailyChallengeCompletions.challengeDate, dateStr))
    .orderBy(desc(dailyChallengeCompletions.score))
    .limit(50);

  const results = [];
  for (const entry of entries) {
    const profile = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.userId, entry.userId))
      .limit(1);

    results.push({
      rank: results.length + 1,
      displayName: profile[0]?.displayName || 'Player',
      score: entry.score,
      durationSeconds: entry.durationSeconds,
    });
  }

  return c.json({ date: dateStr, entries: results });
});

// GET /api/challenges/me - My recent completions + streak
challengeRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DATABASE_URL);

  const recent = await db
    .select()
    .from(dailyChallengeCompletions)
    .where(eq(dailyChallengeCompletions.userId, user.id))
    .orderBy(desc(dailyChallengeCompletions.completedAt))
    .limit(10);

  // Calculate streak
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().slice(0, 10);
    const found = recent.find(r => r.challengeDate === dateStr);
    if (found) {
      streak++;
    } else if (i > 0) {
      break; // Streak broken
    }
  }

  return c.json({
    completions: recent.map(r => ({
      date: r.challengeDate,
      templateId: r.templateId,
      score: r.score,
      completedAt: r.completedAt,
    })),
    streak,
  });
});

export { challengeRoutes };
