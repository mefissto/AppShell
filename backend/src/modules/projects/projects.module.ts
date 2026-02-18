import { Module } from '@nestjs/common';

import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [AuditLoggerModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
