import { Module } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';

@Module({
  providers: [NotificationsService, EmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
