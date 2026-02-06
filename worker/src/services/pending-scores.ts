import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { pendingScores, leaderboardEntries } from '../db/schema';

/**
 * Move all pending scores for a user to the leaderboard.
 * Called after email verification.
 * @returns Number of scores moved
 */
export async function movePendingScoresToLeaderboard(
  databaseUrl: string,
  userId: string
): Promise<number> {
  const db = getDb(databaseUrl);

  // Get all pending scores for this user
  const pending = await db
    .select()
    .from(pendingScores)
    .where(eq(pendingScores.userId, userId));

  if (pending.length === 0) {
    return 0;
  }

  // Insert each pending score into the leaderboard
  for (const score of pending) {
    await db.insert(leaderboardEntries).values({
      userId: score.userId,
      displayName: score.displayName,
      score: score.score,
      difficulty: score.difficulty,
      waveReached: score.waveReached,
      towersBuilt: score.towersBuilt,
      enemiesKilled: score.enemiesKilled,
      durationSeconds: score.durationSeconds,
    });
  }

  // Delete the pending scores
  await db.delete(pendingScores).where(eq(pendingScores.userId, userId));

  return pending.length;
}
