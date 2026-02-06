/**
 * Script to delete a user and all related data from the database
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx scripts/delete-user.ts "user@email.com"
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const userEmail = process.argv[2];

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!userEmail) {
  console.error('Error: User email is required as argument');
  console.error('Usage: DATABASE_URL="..." npx tsx scripts/delete-user.ts "user@email.com"');
  process.exit(1);
}

async function deleteUser() {
  const sql = neon(DATABASE_URL!);

  console.log(`\nSearching for user with email: ${userEmail}`);

  // Find the user
  const users = await sql`SELECT id, name, email FROM "user" WHERE email = ${userEmail}`;

  if (users.length === 0) {
    console.log('User not found');
    process.exit(0);
  }

  const user = users[0];
  const userId = user.id;
  console.log(`Found user: ${user.name} (${userId})`);
  console.log('\nDeleting related data...\n');

  // Delete in order due to foreign key constraints
  try {
    await sql`DELETE FROM daily_challenge_completions WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from daily_challenge_completions');
  } catch (err: any) {
    console.log(`  - daily_challenge_completions: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM game_history WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from game_history');
  } catch (err: any) {
    console.log(`  - game_history: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM achievements WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from achievements');
  } catch (err: any) {
    console.log(`  - achievements: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM progression WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from progression');
  } catch (err: any) {
    console.log(`  - progression: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM game_saves WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from game_saves');
  } catch (err: any) {
    console.log(`  - game_saves: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM leaderboard_entries WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from leaderboard_entries');
  } catch (err: any) {
    console.log(`  - leaderboard_entries: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM profiles WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from profiles');
  } catch (err: any) {
    console.log(`  - profiles: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM session WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from session');
  } catch (err: any) {
    console.log(`  - session: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  try {
    await sql`DELETE FROM account WHERE user_id = ${userId}`;
    console.log('  ✓ Deleted from account');
  } catch (err: any) {
    console.log(`  - account: ${err.message?.slice(0, 50) || 'skipped'}`);
  }

  // Finally delete the user
  try {
    await sql`DELETE FROM "user" WHERE id = ${userId}`;
    console.log('  ✓ Deleted user record');
  } catch (err: any) {
    console.log(`  ✗ Error deleting user: ${err.message}`);
  }

  console.log('\n✅ User deletion complete!\n');
}

deleteUser().catch(console.error);
