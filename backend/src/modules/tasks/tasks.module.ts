import { Module } from '@nestjs/common';

import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { PaginationModule } from '@pagination/pagination.module';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PaginationModule, AuditLoggerModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
