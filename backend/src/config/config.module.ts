import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { EnvironmentModes } from '@interfaces/environment-variables';

import appConfig from './app.config';
import databaseConfig from './database.config';
import envValidationSchema from './environment.validation';
import jwtConfig from './jwt.config';

/**
 * Load the environment file based on the NODE_ENV environment variable
 */
const env = process.env.NODE_ENV?.trim();
const envFilePath = env ? `.env.${env}` : '.env';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      load: [appConfig, databaseConfig, jwtConfig],
      validate: (config) => {
        const { error, value, warning } = envValidationSchema.validate(config, {
          allowUnknown: env !== EnvironmentModes.PRODUCTION,
          abortEarly: true,
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
