import { Module } from '@nestjs/common';

import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { PaginationModule } from '@pagination/pagination.module';

import { TaskRemindersModule } from '@modules/task-reminders/task-reminders.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PaginationModule, AuditLoggerModule, TaskRemindersModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
