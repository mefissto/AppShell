import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import dotenv from 'dotenv';

export interface PrismaEnvLoadResult {
  baseEnvFilePath?: string;
  envSpecificFilePath?: string;
  explicitEnvFilePath?: string;
  appEnv?: string;
}

function normalizeAppEnv(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();

  return normalized || undefined;
}

export function loadPrismaEnvironmentVariables(): PrismaEnvLoadResult {
  const appEnv = normalizeAppEnv(process.env.APP_ENV);
  const explicitEnvFilePath = process.env.ENV_FILE?.trim();

  const baseEnvPath = resolve(process.cwd(), '.env');
  const envSpecificPath = appEnv
    ? resolve(process.cwd(), `.env.${appEnv}`)
    : undefined;
  const explicitEnvPath = explicitEnvFilePath
    ? resolve(process.cwd(), explicitEnvFilePath)
    : undefined;
  console.info(
    'Attempting to load Prisma environment variables with the following configuration:',
  );
  console.info(`APP_ENV: ${appEnv ?? 'not set'}`);
  console.info(`ENV_FILE: ${explicitEnvFilePath ?? 'not set'}`);

  if (existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath, override: false });
  }

  if (envSpecificPath && existsSync(envSpecificPath)) {
    dotenv.config({ path: envSpecificPath, override: true });
  }

  if (explicitEnvPath && existsSync(explicitEnvPath)) {
    dotenv.config({ path: explicitEnvPath, override: true });
  }

  return {
    baseEnvFilePath: existsSync(baseEnvPath) ? '.env' : undefined,
    envSpecificFilePath:
      envSpecificPath && existsSync(envSpecificPath)
        ? `.env.${appEnv}`
        : undefined,
    explicitEnvFilePath:
      explicitEnvPath && existsSync(explicitEnvPath)
        ? explicitEnvFilePath
        : undefined,
    appEnv,
  };
}
