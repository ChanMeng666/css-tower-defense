import { pgTable, serial, text, varchar, integer, jsonb, timestamp, uniqueIndex, index, boolean } from 'drizzle-orm/pg-core';

// ── Auth tables (managed by Better Auth) ──

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ── Game tables ──

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id),
  displayName: varchar('display_name', { length: 30 }).notNull(),
  totalGamesPlayed: integer('total_games_played').default(0),
  totalEnemiesKilled: integer('total_enemies_killed').default(0),
  totalGoldEarned: integer('total_gold_earned').default(0),
  totalPlayTimeSeconds: integer('total_play_time_seconds').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leaderboardEntries = pgTable('leaderboard_entries', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  displayName: varchar('display_name', { length: 30 }).notNull(),
  score: integer('score').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(),
  waveReached: integer('wave_reached').notNull(),
  towersBuilt: integer('towers_built').default(0),
  enemiesKilled: integer('enemies_killed').default(0),
  durationSeconds: integer('duration_seconds'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  scoreIdx: index('idx_lb_score').on(t.difficulty, t.score),
  userIdx: index('idx_lb_user').on(t.userId),
}));

export const gameSaves = pgTable('game_saves', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  slot: integer('slot').notNull(),
  saveName: varchar('save_name', { length: 50 }),
  difficulty: varchar('difficulty', { length: 10 }).notNull(),
  gold: integer('gold').notNull(),
  lives: integer('lives').notNull(),
  score: integer('score').notNull(),
  currentWave: integer('current_wave').notNull(),
  inventory: jsonb('inventory').default({}),
  towers: jsonb('towers').default([]),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  slotUniq: uniqueIndex('idx_save_slot').on(t.userId, t.slot),
}));

export const progression = pgTable('progression', {
  userId: text('user_id').primaryKey().references(() => user.id),
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  skillPoints: integer('skill_points').default(0),
  upgrades: jsonb('upgrades').default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  achievementId: varchar('achievement_id', { length: 30 }).notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('idx_ach_uniq').on(t.userId, t.achievementId),
}));

export const gameHistory = pgTable('game_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  difficulty: varchar('difficulty', { length: 10 }).notNull(),
  score: integer('score').notNull(),
  waveReached: integer('wave_reached').notNull(),
  outcome: varchar('outcome', { length: 10 }).notNull(),
  durationSeconds: integer('duration_seconds'),
  towersBuilt: integer('towers_built').default(0),
  enemiesKilled: integer('enemies_killed').default(0),
  playedAt: timestamp('played_at').defaultNow(),
}, (t) => ({
  userIdx: index('idx_gh_user').on(t.userId, t.playedAt),
}));
