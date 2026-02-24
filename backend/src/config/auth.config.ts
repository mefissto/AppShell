import { registerAs } from '@nestjs/config';
import { StringValue } from 'ms';

import {
  AuthEnvConfig,
  EnvironmentVariableKeys,
} from '@interfaces/environment-variables';

/**
 * Auth environment configuration
 *
 * Note: Type assertions are used to ensure correct types since environment variables are always strings
 * Joi validation should catch any incorrect types at startup
 *
 * ?TODO: Consider adding runtime type checks if necessary
 */
export default registerAs(
  EnvironmentVariableKeys.AUTH,
  (): AuthEnvConfig => ({
    jwtSecret: process.env.JWT_SECRET as string,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
    audience: process.env.JWT_TOKEN_AUDIENCE as string,
    issuer: process.env.JWT_TOKEN_ISSUER as string,
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL as number | StringValue,
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL as number | StringValue,
    emailVerificationTokenTtl: parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_TTL as string,
      10,
    ),
    emailVerificationUrl: process.env.EMAIL_VERIFICATION_URL as string,
  }),
);
