import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { EnvironmentModes } from '@interfaces/environment-variables';

import appConfig from './app.config';
import authConfig from './auth.config';
import databaseConfig from './database.config';
import notificationsConfig from './notifications.config';
import schedulerConfig from './scheduler.config';
import securityConfig from './security.config';
import envValidationSchema from './validation/environment.validation';

/**
 * Load the environment file based on the APP_ENV environment variable
 */
const env = process.env.APP_ENV?.trim();
const envFilePath = env ? `.env.${env}` : '.env';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      ignoreEnvFile: env === EnvironmentModes.PRODUCTION, // In production, we should rely on actual environment variables instead of .env file
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        notificationsConfig,
        schedulerConfig,
        securityConfig,
      ],
      validate: (config) => {
        const { error, value, warning } = envValidationSchema.validate(config, {
          allowUnknown: false, // Disallow unknown keys to prevent typos and ensure all config is validated
          abortEarly: false, // Return all errors instead of stopping at the first one to provide better feedback on all issues at once
          // * Remove unknown keys to prevent them from being used in the app
          // ? Instead of this, it may require to create a separate schema model and define all keys, and then take only those from env variables,
          // ? it provides better safety and prevents typos in env variable names from causing issues
          stripUnknown: true,
        });

        if (warning) {
          console.warn(`Joi Config validation warning: ${warning.message}`);
        }

        if (error) {
          throw new Error(`Joi Config validation error: ${error.message}`);
        }

        return value;
      },
    }),
  ],
})
export class ConfigModule {}
