import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { EmailOutboxModule } from '@modules/email-outbox/email-outbox.module';
import { Module } from '@nestjs/common';
import { PaginationModule } from '@pagination/pagination.module';

import { TaskRemindersModule } from '@modules/task-reminders/task-reminders.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    PaginationModule,
    AuditLoggerModule,
    TaskRemindersModule,
    EmailOutboxModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
