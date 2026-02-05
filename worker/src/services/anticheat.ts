/**
 * Anti-cheat heuristics for score validation.
 * Returns { valid: boolean, reason?: string }.
 */

// Max theoretical score per wave (generous upper bound)
const MAX_SCORE_PER_WAVE = 5000;

// Minimum seconds per wave (average ~30s per wave)
const MIN_SECONDS_PER_WAVE = 20;

export function validateScore(data: {
  score: number;
  waveReached: number;
  durationSeconds?: number;
  towersBuilt?: number;
  enemiesKilled?: number;
  difficulty: string;
}): { valid: boolean; reason?: string } {
  const { score, waveReached, durationSeconds, towersBuilt, difficulty } = data;

  // Basic sanity checks
  if (score < 0 || waveReached < 1 || waveReached > 10) {
    return { valid: false, reason: 'Invalid score or wave values' };
  }

  if (!['normal', 'hard', 'expert'].includes(difficulty)) {
    return { valid: false, reason: 'Invalid difficulty' };
  }

  // Score bounds check: reject > 150% of theoretical max
  const maxPossibleScore = MAX_SCORE_PER_WAVE * waveReached * 1.5;
  if (score > maxPossibleScore) {
    return { valid: false, reason: 'Score exceeds theoretical maximum' };
  }

  // Duration check: minimum game time
  if (durationSeconds !== undefined && durationSeconds > 0) {
    const minDuration = waveReached * MIN_SECONDS_PER_WAVE;
    if (durationSeconds < minDuration) {
      return { valid: false, reason: 'Game duration too short' };
    }
  }

  // Tower validation: at least 1 tower must have been built
  if (towersBuilt !== undefined && towersBuilt < 1 && waveReached > 1) {
    return { valid: false, reason: 'No towers built' };
  }

  return { valid: true };
}
