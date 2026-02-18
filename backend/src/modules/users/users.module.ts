import { Module } from '@nestjs/common';

import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { SecurityModule } from '@modules/security/security.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SecurityModule, AuditLoggerModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
