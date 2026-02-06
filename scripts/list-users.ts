import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

async function main() {
  const sql = neon(DATABASE_URL!);
  const users = await sql`SELECT id, name, email, created_at FROM "user" ORDER BY created_at DESC`;
  console.log('\nUsers in database:\n');
  if (users.length === 0) {
    console.log('  (none)');
  } else {
    users.forEach(u => console.log(`  - ${u.name} <${u.email}> (${u.id.slice(0,8)}...)`));
  }
  console.log(`\nTotal: ${users.length} users\n`);
}

main().catch(console.error);
