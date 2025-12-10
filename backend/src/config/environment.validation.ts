import * as Joi from 'joi';

import { EnvironmentModes } from '@interfaces/environment-variables';

// Regex pattern to match strings like '1d', '2h', '30m', etc.
const msPattern = /^\d+[smhd]$/;

/**
 * Joi schema for validating and transforming environment variables
 */
export default Joi.object({
  // APP
  APP_NAME: Joi.string().required(),
  APP_VERSION: Joi.string().required(),
  APP_PORT: Joi.number().port().default(3000),
  API_VERSION: Joi.string().required(),
  NODE_ENV: Joi.string()
    .trim()
    .valid(
      EnvironmentModes.DEVELOPMENT,
      EnvironmentModes.PRODUCTION,
      EnvironmentModes.TEST,
    )
    .default(EnvironmentModes.DEVELOPMENT),
  HASH_SALT_ROUNDS: Joi.number().integer().min(4).max(31).default(10),

  // DATABASE
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  // TTL can be number (seconds) or string ('1d', '2h', '30m', etc.)
  JWT_ACCESS_TOKEN_TTL: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(msPattern))
    .required(),
  JWT_REFRESH_TOKEN_TTL: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(msPattern))
    .required(),
});
