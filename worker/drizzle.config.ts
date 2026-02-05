import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './worker/src/db/schema.ts',
  out: './worker/drizzle',
  // Note: paths are relative to project root (npm scripts run from there)
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
