import { Module } from '@nestjs/common';

import { NotificationsModule } from '@modules/notifications/notifications.module';
import { TaskRemindersController } from './task-reminders.controller';
import { TaskRemindersService } from './task-reminders.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TaskRemindersController],
  providers: [TaskRemindersService],
  exports: [TaskRemindersService],
})
export class TaskRemindersModule {}
