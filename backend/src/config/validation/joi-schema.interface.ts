import Joi from 'joi';

export declare interface JoiSchema {
  APP_NAME: Joi.StringSchema;
  APP_VERSION: Joi.StringSchema;
  APP_PORT: Joi.StringSchema;
  API_VERSION: Joi.StringSchema;
  APP_ENV: Joi.StringSchema;
  HASH_SALT_ROUNDS: Joi.NumberSchema;
  THROTTLE_TTL: Joi.NumberSchema;
  THROTTLE_LIMIT: Joi.NumberSchema;
  EMAIL_VERIFICATION_TOKEN_TTL: Joi.NumberSchema;
  EMAIL_VERIFICATION_URL: Joi.StringSchema;
  LOG_LEVEL: Joi.StringSchema;
  HEALTH_CHECK_DISK_THRESHOLD_PERCENT: Joi.NumberSchema;
  HEALTH_CHECK_DISK_PATH: Joi.StringSchema;
  DATABASE_URL: Joi.StringSchema;
  JWT_SECRET: Joi.StringSchema;
  JWT_REFRESH_SECRET: Joi.StringSchema;
  JWT_TOKEN_AUDIENCE: Joi.StringSchema;
  JWT_TOKEN_ISSUER: Joi.StringSchema;
  JWT_ACCESS_TOKEN_TTL: Joi.AlternativesSchema;
  JWT_REFRESH_TOKEN_TTL: Joi.AlternativesSchema;
  RESEND_API_KEY: Joi.StringSchema;
  NOTIFICATION_FROM_EMAIL: Joi.StringSchema;
  NOTIFICATION_FROM_NAME: Joi.StringSchema;
  CRON_JOBS_ENABLED: Joi.StringSchema;
  TASK_REMINDER_CRON: Joi.StringSchema;
  CLEANUP_SESSIONS_CRON: Joi.StringSchema;
}
