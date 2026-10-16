/*
 * E2E setup script
 * - Forces APP_ENV=e2e so Prisma loads .env.e2e
 * - Runs Prisma migrations against the e2e database
 */

const { spawnSync } = require('node:child_process');
const { dirname, resolve } = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.e2e' });

const env = { ...process.env, APP_ENV: 'e2e', NODE_ENV: 'e2e' };

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Check .env.e2e.');
  process.exit(1);
}

console.log('Applying Prisma migrations to the e2e database...');

// Run Prisma migrate deploy command to apply migrations to the e2e database
const prismaPackagePath = require.resolve('prisma/package.json');
const prismaCli = resolve(
  dirname(prismaPackagePath),
  require(prismaPackagePath).bin.prisma,
);
const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  stdio: 'inherit',
  env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
