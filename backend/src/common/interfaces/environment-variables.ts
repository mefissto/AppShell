import type { StringValue } from 'ms';

/**
 * Environment modes
 */
export enum EnvironmentModes {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Environment type union
 */
export type EnvironmentType =
  | EnvironmentModes.DEVELOPMENT
  | EnvironmentModes.PRODUCTION
  | EnvironmentModes.TEST;

/**
 * Keys for environment variable configurations
 */
export const enum EnvironmentVariableKeys {
  APP = 'app',
  DATABASE = 'database',
  JWT = 'jwt',
  NOTIFICATIONS = 'notifications',
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
