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
    RESEND_API_KEY?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    ASSETS: Fetcher;
  };
};

// Auth configuration options
interface AuthConfig {
  databaseUrl: string;
  secret: string;
  resendApiKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
}

// Cache auth instances to avoid re-creating on every request
const authCache = new Map<string, ReturnType<typeof betterAuth>>();

// Send email via Resend API
async function sendEmail(resendApiKey: string, to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CSS Tower Defense <noreply@chanmeng.org>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Auth] Email send failed:', error);
    throw new Error('Failed to send email');
  }

  return response.json();
}

export function getAuth(config: AuthConfig, baseURL?: string) {
  // Use provided baseURL or default to production domain
  const effectiveBaseURL = baseURL || 'https://towerdefense.chanmeng.org';
  const cacheKey = effectiveBaseURL;
  const cached = authCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb(config.databaseUrl);

  const auth = betterAuth({
    baseURL: effectiveBaseURL,
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
    secret: config.secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !!config.resendApiKey, // Only require if email service configured
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
    },
    emailVerification: config.resendApiKey ? {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
        await sendEmail(
          config.resendApiKey!,
          user.email,
          'Verify your email - CSS Tower Defense',
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F2D864;">CSS Tower Defense</h1>
            <p>Hi ${user.name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="${url}" style="display: inline-block; background: #4A90C4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Verify Email
            </a>
            <p>Or copy this link: <br><a href="${url}">${url}</a></p>
            <p>This link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #888; font-size: 12px;">If you didn't create an account, you can ignore this email.</p>
          </div>
          `
        );
      },
    } : undefined,
    socialProviders: config.googleClientId && config.googleClientSecret ? {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      },
    } : undefined,
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
      useSecureCookies: true,
    },
    trustedOrigins: [
      'https://towerdefense.chanmeng.org',
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

// Helper to get base URL from request
function getBaseURL(c: any): string {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

// Custom Google OAuth redirect endpoint - forwards to Better Auth handler
authRoutes.get('/google', async (c) => {
  const baseURL = getBaseURL(c);

  if (!c.env.GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google OAuth not configured' }, 500);
  }

  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    resendApiKey: c.env.RESEND_API_KEY,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  }, baseURL);

  try {
    // Create a POST request to Better Auth's sign-in endpoint
    // This ensures cookies are properly set by the handler
    const signInUrl = new URL('/api/auth/sign-in/social', baseURL);
    const postRequest = new Request(signInUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': c.req.header('Cookie') || '',
        'Origin': baseURL,
        'Referer': baseURL + '/',
      },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: '/',
      }),
    });

    const response = await auth.handler(postRequest);

    // Check if response is JSON with redirect URL
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const cloned = response.clone();
      try {
        const data = await cloned.json() as { url?: string; redirect?: boolean };
        if (data.redirect && data.url) {
          // Copy cookies from the response
          const cookies = response.headers.get('set-cookie');
          const redirectResponse = c.redirect(data.url);
          if (cookies) {
            // Preserve the state cookie
            redirectResponse.headers.set('Set-Cookie', cookies);
          }
          return redirectResponse;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return response;
  } catch (error) {
    console.error('[Auth] Google OAuth error:', error);
    return c.json({ error: 'OAuth initialization failed', details: String(error) }, 500);
  }
});

// POST /api/auth/resend-verification - Resend email verification
authRoutes.post('/resend-verification', async (c) => {
  const baseURL = getBaseURL(c);

  if (!c.env.RESEND_API_KEY) {
    return c.json({ error: 'Email service not configured' }, 500);
  }

  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    resendApiKey: c.env.RESEND_API_KEY,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  }, baseURL);

  // Get current session
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: 'Not logged in' }, 401);
  }

  if (session.user.emailVerified) {
    return c.json({ error: 'Email already verified' }, 400);
  }

  try {
    // Use Better Auth's sendVerificationEmail endpoint
    const verifyRequest = new Request(new URL('/api/auth/send-verification-email', baseURL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': c.req.header('Cookie') || '',
        'Origin': baseURL,
        'Referer': baseURL + '/',
      },
      body: JSON.stringify({
        email: session.user.email,
      }),
    });

    const response = await auth.handler(verifyRequest);

    if (response.ok) {
      return c.json({ success: true, message: 'Verification email sent!' });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return c.json({ error: 'Failed to send email', details: errorData }, 500);
    }
  } catch (error) {
    console.error('[Auth] Resend verification error:', error);
    return c.json({ error: 'Failed to send verification email' }, 500);
  }
});

// Mount Better Auth as a catch-all under /api/auth/*
authRoutes.all('/*', async (c) => {
  const baseURL = getBaseURL(c);
  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    resendApiKey: c.env.RESEND_API_KEY,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  }, baseURL);

  try {
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error('[Auth] Handler error:', error);
    return c.json({ error: 'Auth handler failed', details: String(error) }, 500);
  }
});

export { authRoutes };
