import { registerAs } from '@nestjs/config';

import {
  DatabaseEnvConfig,
  EnvironmentVariableKeys,
} from '@interfaces/environment-variables';

/**
 * Database environment configuration
 *
 * Note: Type assertions are used to ensure correct types since environment variables are always strings
 * Joi validation should catch any incorrect types at startup
 *
 * ?TODO: Consider adding runtime type checks if necessary
 */
export default registerAs(
  EnvironmentVariableKeys.DATABASE,
  (): DatabaseEnvConfig => ({
    url: process.env.DATABASE_URL as string,
  }),
);
