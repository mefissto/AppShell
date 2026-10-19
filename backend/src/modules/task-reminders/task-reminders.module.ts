import { Module } from '@nestjs/common';

import { NotificationsModule } from '@modules/notifications/notifications.module';
import { TaskRemindersService } from './task-reminders.service';

@Module({
  imports: [NotificationsModule],
  providers: [TaskRemindersService],
  exports: [TaskRemindersService],
})
export class TaskRemindersModule {}
