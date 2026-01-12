import { Injectable } from '@nestjs/common';

import { EmailService } from './services/email.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly emailService: EmailService) {}

  async sendEmailNotification(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    await this.emailService.sendEmail(to, subject, body);
  }
}
