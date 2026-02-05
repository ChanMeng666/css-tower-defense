import { createMiddleware } from 'hono/factory';
import { getAuth } from '../routes/auth';

type Env = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    ASSETS: Fetcher;
  };
  Variables: {
    user: { id: string; name: string; email: string } | null;
  };
};

/**
 * Auth middleware - attaches user to context if session is valid.
 * Does NOT reject unauthenticated requests (use requireAuth for that).
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  c.set('user', session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  } : null);

  await next();
});

/**
 * Require authentication - returns 401 if not logged in.
 */
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const auth = getAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);

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
  });

  await next();
});
