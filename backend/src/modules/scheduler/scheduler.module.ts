import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import schedulerConfig from '@config/scheduler.config';
import { EmailOutboxModule } from '@modules/email-outbox/email-outbox.module';
import { TaskRemindersModule } from '@modules/task-reminders/task-reminders.module';

import { EmailOutboxJob } from './jobs/email-outbox.job';
import { TaskRemindersJob } from './jobs/task-reminders.job';
import { SchedulerRunner } from './scheduler.runner';

@Module({
  imports: [
    ScheduleModule.forRootAsync({
      useFactory: async (config: ConfigType<typeof schedulerConfig>) => ({
        cronJobs: config.cronJobsEnabled,
      }),
      inject: [schedulerConfig.KEY],
    }),
    TaskRemindersModule,
    EmailOutboxModule,
  ],
  providers: [SchedulerRunner, TaskRemindersJob, EmailOutboxJob],
  exports: [SchedulerRunner],
})
export class SchedulerModule {}
