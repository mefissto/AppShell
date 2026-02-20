import { LogLevel } from '@nestjs/common';
import type { StringValue } from 'ms';

/**
 * Environment modes
 */
export enum EnvironmentModes {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
  E2E = 'e2e',
}

/**
 * Environment type union
 */
export type EnvironmentType =
  | EnvironmentModes.DEVELOPMENT
  | EnvironmentModes.PRODUCTION
  | EnvironmentModes.TEST
  | EnvironmentModes.E2E;

/**
 * Keys for environment variable configurations
 */
export const enum EnvironmentVariableKeys {
  APP = 'app',
  DATABASE = 'database',
  JWT = 'jwt',
  NOTIFICATIONS = 'notifications',
  SCHEDULER = 'scheduler',
}

/**
 * Application environment configuration interface
 */
export interface AppEnvConfig {
  name: string;
  version: string;
  port: number;
  apiVersion: string;
  env: string;
  hashSaltRounds: number;
  throttleTtl: number;
  throttleLimit: number;
  logLevel: LogLevel;
  emailVerificationTokenTtl: number;
  emailVerificationUrl: string;
}

/**
 * Database environment configuration interface
 */
export interface DatabaseEnvConfig {
  url: string;
}

/**
 * JWT environment configuration interface
 */
export interface JwtEnvConfig {
  secret: string;
  refreshSecret: string;
  audience: string;
  issuer: string;
  accessTokenTtl: number | StringValue;
  refreshTokenTtl: number | StringValue;
}

/**
 * Notifications environment configuration interface
 */
export interface NotificationsEnvConfig {
  resend: {
    apiKey: string;
  };
  email: {
    from: string;
    fromName: string;
  };
}

/**
 * Scheduler environment configuration interface
 */
export interface SchedulerEnvConfig {
  cronJobsEnabled: boolean;
  cronCleanupSessions: string;
  cronTaskReminders: string;
}
