import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { leaderboardRoutes } from './routes/leaderboard';
import { savesRoutes } from './routes/saves';
import { progressionRoutes } from './routes/progression';
import { statsRoutes } from './routes/stats';
import { challengeRoutes } from './routes/challenges';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for local development
app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/saves', savesRoutes);
app.route('/api/progression', progressionRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api/challenges', challengeRoutes);

// Non-API requests fall through to static assets (handled by [assets] config)

export default app;
