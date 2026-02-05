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

// Create auth instance dynamically per request to handle different origins
export function createAuth(databaseUrl: string, secret: string, baseURL: string) {
  const db = getDb(databaseUrl);
  return betterAuth({
    baseURL,
    basePath: '/api/auth',
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
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes cache
      },
    },
    advanced: {
      cookiePrefix: 'td',
      useSecureCookies: true, // Always use secure cookies (HTTPS)
    },
    trustedOrigins: [
      'https://css-tower-defense.chanmeng-dev.workers.dev',
      'https://css-tower-defense.pages.dev',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ],
  });
}

const authRoutes = new Hono<Env>();

// Mount Better Auth as a catch-all under /api/auth/*
authRoutes.all('/*', async (c) => {
  // Get the origin from the request to set proper baseURL
  const url = new URL(c.req.url);
  const baseURL = `${url.protocol}//${url.host}`;

  const auth = createAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET, baseURL);
  return auth.handler(c.req.raw);
});

export { authRoutes };
