import * as Joi from 'joi';

import { EnvironmentModes } from '@interfaces/environment-variables';
import { cronExpressionSchema } from './cron-expression.schema';
import { JoiSchema } from './joi-schema.interface';
import { portSchema } from './port.chema';

// Regex pattern to match strings like '1d', '2h', '30m', etc.
const msPattern = /^\d+[smhd]$/;

/**
 * Joi schema for validating and transforming environment variables
 */
export default Joi.object<JoiSchema>({
  // APP
  APP_NAME: Joi.string().required(),
  APP_VERSION: Joi.string().required(),
  APP_PORT: portSchema.required(),
  API_VERSION: Joi.string().required(),
  APP_ENV: Joi.string()
    .trim()
    .valid(
      EnvironmentModes.DEVELOPMENT,
      EnvironmentModes.PRODUCTION,
      EnvironmentModes.TEST,
      EnvironmentModes.E2E,
    )
    .default(EnvironmentModes.DEVELOPMENT),
  LOG_LEVEL: Joi.string()
    .valid('verbose', 'debug', 'log', 'warn', 'error', 'fatal')
    .required(),
  HEALTH_CHECK_DISK_THRESHOLD_PERCENT: Joi.number()
    .positive()
    .greater(0)
    .precision(2)
    .less(1)
    .default(0.9), // 90% usage threshold
  HEALTH_CHECK_DISK_PATH: Joi.string().default('/'),

  // SECURITY
  HASH_SALT_ROUNDS: Joi.number().integer().min(4).max(31).default(10),
  THROTTLE_TTL: Joi.number().integer().positive().required(),
  THROTTLE_LIMIT: Joi.number().integer().positive().required(),

  // DATABASE
  DATABASE_URL: Joi.string().uri().required(),

  // AUTH
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
  EMAIL_VERIFICATION_TOKEN_TTL: Joi.number().integer().positive().required(),
  EMAIL_VERIFICATION_URL: Joi.string().uri().required(),

  // NOTIFICATIONS
  RESEND_API_KEY: Joi.string().min(20).required(),
  NOTIFICATION_FROM_EMAIL: Joi.string().email().required(),
  NOTIFICATION_FROM_NAME: Joi.string().min(2).required(),

  // SCHEDULER
  CRON_JOBS_ENABLED: Joi.string().valid('true', 'false').required(),
  TASK_REMINDER_CRON: cronExpressionSchema.required(),
  CLEANUP_SESSIONS_CRON: cronExpressionSchema.required(),
});
