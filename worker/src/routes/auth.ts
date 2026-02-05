import { Hono } from 'hono';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db';
import * as schema from '../db/schema';

// Web Crypto API based password hashing (edge-compatible, lighter than bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  // Combine salt + hash and encode as base64
  const combined = new Uint8Array(salt.length + hash.byteLength);
  combined.set(salt);
  combined.set(new Uint8Array(hash), salt.length);
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(data: { password: string; hash: string }): Promise<boolean> {
  try {
    const { password, hash: storedHash } = data;
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const originalHash = combined.slice(16);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const newHash = new Uint8Array(hash);
    if (newHash.length !== originalHash.length) return false;
    for (let i = 0; i < newHash.length; i++) {
      if (newHash[i] !== originalHash[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

type Env = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    ASSETS: Fetcher;
  };
};

// Cache auth instances by baseURL to avoid re-creating on every request
const authCache = new Map<string, ReturnType<typeof betterAuth>>();

export function getAuth(databaseUrl: string, secret: string, baseURL?: string) {
  // Use baseURL as cache key, or 'default' if not provided
  const cacheKey = baseURL || 'default';

  const cached = authCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb(databaseUrl);
  const auth = betterAuth({
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
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
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

  authCache.set(cacheKey, auth);
  return auth;
}

const authRoutes = new Hono<Env>();

// Mount Better Auth as a catch-all under /api/auth/*
authRoutes.all('/*', async (c) => {
  const auth = getAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);
  return auth.handler(c.req.raw);
});

export { authRoutes };
