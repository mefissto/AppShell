import { Module } from '@nestjs/common';

import { EmailOutboxModule } from '@modules/email-outbox/email-outbox.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

import { TaskRemindersController } from './task-reminders.controller';
import { TaskRemindersService } from './task-reminders.service';

@Module({
  imports: [NotificationsModule, EmailOutboxModule],
  controllers: [TaskRemindersController],
  providers: [TaskRemindersService],
  exports: [TaskRemindersService],
})
export class TaskRemindersModule {}
