import { registerAs } from '@nestjs/config';

import {
    EnvironmentVariableKeys,
    SecurityEnvConfig,
} from '@interfaces/environment-variables';

/**
 * Security environment configuration
 *
 * Note: Type assertions are used to ensure correct types since environment variables are always strings
 * Joi validation should catch any incorrect types at startup
 *
 * ?TODO: Consider adding runtime type checks if necessary
 */
export default registerAs(
  EnvironmentVariableKeys.SECURITY,
  (): SecurityEnvConfig => ({
    hashSaltRounds: parseInt(process.env.HASH_SALT_ROUNDS as string, 10),
    throttleTtl: parseInt(process.env.THROTTLE_TTL as string, 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT as string, 10),
  }),
);
