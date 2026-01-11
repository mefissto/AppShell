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
    env: process.env.NODE_ENV as string,
    hashSaltRounds: parseInt(process.env.HASH_SALT_ROUNDS as string, 10),
    throttleTtl: parseInt(process.env.THROTTLE_TTL as string, 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT as string, 10),
  }),
);
