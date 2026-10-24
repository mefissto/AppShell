import { PrismaClient } from '@generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { loadPrismaEnvironmentVariables } from '../env';
import { runDevSeed } from './seed-dev';
import { runPerformanceSeed } from './seed-performance';
import { parseSeedCommandArgs } from './utils';

const envLoadResult = loadPrismaEnvironmentVariables();

const allowedEnvironments = ['development', 'e2e'];
if (!allowedEnvironments.includes(envLoadResult.appEnv ?? '')) {
  throw new Error(
    `Seeding is only allowed in development or e2e environments. Current environment: ${envLoadResult.appEnv}`,
  );
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set after loading Prisma environment files',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.info(
    `Seeding the database for environment: ${envLoadResult.appEnv ?? 'default'}`,
  );
  console.info(
    `Loaded env files: ${
      [
        envLoadResult.baseEnvFilePath,
        envLoadResult.envSpecificFilePath,
        envLoadResult.explicitEnvFilePath,
      ]
        .filter(Boolean)
        .join(', ') || 'none (using process environment only)'
    }`,
  );

  console.info('Starting to seed the database...');

  const args = parseSeedCommandArgs();

  switch (args.seedType) {
    case 'default':
      await runDevSeed(prisma);
      break;
    case 'performance':
      await runPerformanceSeed(prisma, args);
      break;
    default:
      throw new Error(`Unsupported seed type: ${args.seedType}`);
  }

  console.info('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
