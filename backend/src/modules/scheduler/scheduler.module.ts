import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import schedulerConfig from '@config/scheduler.config';
import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { TasksModule } from '@modules/tasks/tasks.module';

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
    TasksModule,
    NotificationsModule,
    AuditLoggerModule,
  ],
  providers: [SchedulerRunner, TaskRemindersJob],
  exports: [SchedulerRunner],
})
export class SchedulerModule {}
