import { Hono } from 'hono';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db';
import * as schema from '../db/schema';

type Env = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    ASSETS: Fetcher;
  };
};

// Cache auth instance per DATABASE_URL to avoid re-creating on every request
let cachedAuth: ReturnType<typeof betterAuth> | null = null;
let cachedUrl: string | null = null;

export function getAuth(databaseUrl: string, secret: string) {
  if (cachedAuth && cachedUrl === databaseUrl) {
    return cachedAuth;
  }
  const db = getDb(databaseUrl);
  cachedAuth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret,
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
  cachedUrl = databaseUrl;
  return cachedAuth;
}

const authRoutes = new Hono<Env>();

// Mount Better Auth as a catch-all under /api/auth/*
authRoutes.all('/*', async (c) => {
  const auth = getAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);
  return auth.handler(c.req.raw);
});

export { authRoutes };
