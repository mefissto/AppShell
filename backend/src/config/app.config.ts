import { LogLevel } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

import {
  AppEnvConfig,
  EnvironmentVariableKeys,
} from '@interfaces/environment-variables';

/**
 * Common application environment configuration
 *
 * Note: Type assertions are used to ensure correct types since environment variables are always strings
 * Joi validation should catch any incorrect types at startup
 *
 * ?TODO: Consider adding runtime type checks if necessary
 */
export default registerAs(
  EnvironmentVariableKeys.APP,
  (): AppEnvConfig => ({
    name: process.env.APP_NAME as string,
    version: process.env.APP_VERSION as string,
    port: parseInt(process.env.APP_PORT as string, 10),
    apiVersion: process.env.API_VERSION as string,
    env: process.env.APP_ENV as string,
    logLevel: process.env.LOG_LEVEL as LogLevel,
    healthCheckDiskThresholdPercent: parseFloat(
      process.env.HEALTH_CHECK_DISK_THRESHOLD_PERCENT as string,
    ),
    healthCheckDiskPath: process.env.HEALTH_CHECK_DISK_PATH as string,
  }),
);
