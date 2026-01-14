import * as Joi from 'joi';

import { EnvironmentModes } from '@interfaces/environment-variables';

// Regex pattern to match strings like '1d', '2h', '30m', etc.
const msPattern = /^\d+[smhd]$/;
// Port range constants
const minPortValue = 0;
const maxPortValue = 65535;

const portValidation = (value: string) => {
  const num = parseInt(value, 10);
  if (num < minPortValue || num > maxPortValue) {
    throw new Error(`Port must be between ${minPortValue} and ${maxPortValue}`);
  }
  return num;
};

/**
 * Joi schema for validating and transforming environment variables
 */
export default Joi.object({
  // APP
  APP_NAME: Joi.string().required(),
  APP_VERSION: Joi.string().required(),
  APP_PORT: Joi.string()
    .pattern(/^\d+$/, 'Port must be a plain number without scientific notation')
    .required()
    .custom(portValidation)
    .default(3000),
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
  THROTTLE_TTL: Joi.number().integer().positive().required(),
  THROTTLE_LIMIT: Joi.number().integer().positive().required(),
  EMAIL_VERIFICATION_TOKEN_TTL: Joi.number().integer().positive().required(),
  EMAIL_VERIFICATION_URL: Joi.string().uri().required(),
  LOG_LEVEL: Joi.string()
    .valid('verbose', 'debug', 'log', 'warn', 'error', 'fatal')
    .required(),

  // DATABASE
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  JWT_TOKEN_AUDIENCE: Joi.string().required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  // TTL can be number (seconds) or string ('1d', '2h', '30m', etc.)
  JWT_ACCESS_TOKEN_TTL: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(msPattern))
    .required(),
  JWT_REFRESH_TOKEN_TTL: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(msPattern))
    .required(),

  // NOTIFICATIONS
  RESEND_API_KEY: Joi.string().min(20).required(),
  NOTIFICATION_FROM_EMAIL: Joi.string().email().required(),
  NOTIFICATION_FROM_NAME: Joi.string().min(2).required(),
});
