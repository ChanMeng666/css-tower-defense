import { createMiddleware } from 'hono/factory';
import { getAuth } from '../routes/auth';

type Env = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    RESEND_API_KEY?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    ASSETS: Fetcher;
  };
  Variables: {
    user: { id: string; name: string; email: string; emailVerified: boolean } | null;
  };
};

/**
 * Auth middleware - attaches user to context if session is valid.
 * Does NOT reject unauthenticated requests (use requireAuth for that).
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    resendApiKey: c.env.RESEND_API_KEY,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  });

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  c.set('user', session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: !!session.user.emailVerified,
  } : null);

  await next();
});

/**
 * Require authentication - returns 401 if not logged in.
 */
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    resendApiKey: c.env.RESEND_API_KEY,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  });

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: !!session.user.emailVerified,
  });

  await next();
});

/**
 * Require verified email - returns 403 if email not verified.
 */
export const requireVerifiedEmail = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    resendApiKey: c.env.RESEND_API_KEY,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  });

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!session.user.emailVerified) {
    return c.json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' }, 403);
  }

  c.set('user', {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: true,
  });

  await next();
});
