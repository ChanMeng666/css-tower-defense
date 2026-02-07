import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { dailyChallengeCompletions, profiles } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { MAX_SCORE_PER_WAVE } from '../services/anticheat';

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

// Challenge templates - must match client-side template IDs
const CHALLENGE_TEMPLATES: Array<{
  id: string; name: string; description: string;
  category: string; waveCount: number; scoreBonus: number;
  timeLimit?: number;
}> = [
  // Constraint (5)
  { id: 'taiaha_only', name: 'Ara Taiaha', description: 'Taiaha towers only', category: 'constraint', waveCount: 4, scoreBonus: 1.5 },
  { id: 'no_sell', name: 'Kore Hoko', description: 'Cannot sell towers', category: 'constraint', waveCount: 4, scoreBonus: 1.25 },
  { id: 'budget', name: 'Pēneti Iti', description: 'Start with only 50 gold', category: 'constraint', waveCount: 3, scoreBonus: 2.0 },
  { id: 'tower_limit', name: 'Ngāwari', description: 'Maximum 6 towers', category: 'constraint', waveCount: 4, scoreBonus: 2.5 },
  { id: 'moana', name: 'Te Moana', description: 'Taiaha and Tangaroa towers only', category: 'constraint', waveCount: 4, scoreBonus: 1.75 },
  // Speed (3)
  { id: 'te_oma_tere', name: 'Te Oma Tere', description: 'Complete 3 waves before time runs out!', category: 'speed', waveCount: 3, scoreBonus: 1.5, timeLimit: 300 },
  { id: 'te_hikoi', name: 'Te Hīkoi', description: '3 dense waves, 4 minute time limit', category: 'speed', waveCount: 3, scoreBonus: 1.75, timeLimit: 240 },
  { id: 'te_whakataetae', name: 'Te Whakataetae', description: '3 waves with toa, 6 minute limit', category: 'speed', waveCount: 3, scoreBonus: 2.0, timeLimit: 360 },
  // Boss (3)
  { id: 'taniwha_duel', name: 'Taniwha Duel', description: '1 warmup wave + boss fight', category: 'boss', waveCount: 2, scoreBonus: 2.0 },
  { id: 'taniwha_tohu', name: 'Taniwha Tohu', description: 'Boss only - no warmup!', category: 'boss', waveCount: 1, scoreBonus: 2.5 },
  { id: 'nga_taniwha', name: 'Ngā Taniwha', description: 'Two taniwha battles!', category: 'boss', waveCount: 2, scoreBonus: 3.0 },
  // Survival (2)
  { id: 'te_whawhai', name: 'Te Whawhai', description: 'Survive as long as you can!', category: 'survival', waveCount: 8, scoreBonus: 1.5 },
  { id: 'te_pakanga_mutunga', name: 'Te Pakanga Mutunga', description: 'Survival with armored enemies!', category: 'survival', waveCount: 8, scoreBonus: 2.0 },
  // Themed (4)
  { id: 'tere_swarm', name: 'Te Tere Swarm', description: 'All swift enemies, wind weather!', category: 'themed', waveCount: 3, scoreBonus: 1.5 },
  { id: 'pakanga_siege', name: 'Te Pakanga Siege', description: 'All armored, winter locked!', category: 'themed', waveCount: 3, scoreBonus: 1.75 },
  { id: 'mate_plague', name: 'Te Mate Plague', description: 'All toxic enemies!', category: 'themed', waveCount: 3, scoreBonus: 1.75 },
  { id: 'rangatira_assault', name: 'Rangatira Assault', description: 'All elite enemies!', category: 'themed', waveCount: 3, scoreBonus: 2.0 },
  // Economy (3)
  { id: 'kore_koura', name: 'Kore Koura', description: 'No gold from kills!', category: 'economy', waveCount: 3, scoreBonus: 2.0 },
  { id: 'koura_nui', name: 'Koura Nui', description: '500 gold, but 2x HP enemies!', category: 'economy', waveCount: 4, scoreBonus: 1.75 },
  { id: 'te_hokohoko', name: 'Te Hokohoko', description: 'Start with 50 gold, big wave rewards!', category: 'economy', waveCount: 3, scoreBonus: 1.5 },
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

  // Challenge-specific score validation
  const maxWaves = challenge.waveCount || 10;
  const maxChallengeScore = maxWaves * MAX_SCORE_PER_WAVE * (challenge.scoreBonus || 1) * 2;
  if (parsed.data.score > maxChallengeScore) {
    return c.json({ error: 'Invalid score' }, 400);
  }

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
