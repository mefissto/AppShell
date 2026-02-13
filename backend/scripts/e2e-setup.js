/*
 * E2E setup script
 * - Forces NODE_ENV=e2e so the app loads .env.e2e
 * - Runs Prisma migrations against the e2e database
 */

const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.e2e' });

const env = { ...process.env, NODE_ENV: 'e2e' };

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Check .env.e2e.');
  process.exit(1);
}

console.log('Applying Prisma migrations to the e2e database...');

// Run Prisma migrate deploy command to apply migrations to the e2e database
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env,
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
