import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import appConfig from '@config/app.config';
import { EnvironmentModes } from '@interfaces/environment-variables';

import { SchedulerRunner } from './scheduler.runner';

@Module({
  imports: [
    ScheduleModule.forRootAsync({
      useFactory: async (config: ConfigType<typeof appConfig>) => ({
        cronJobs: config.env === EnvironmentModes.PRODUCTION, // Only enable cron jobs in production by default, can be overridden by env var
      }),
      inject: [appConfig.KEY],
    }),
  ],
  providers: [SchedulerRunner],
  exports: [SchedulerRunner],
})
export class SchedulerModule {}
