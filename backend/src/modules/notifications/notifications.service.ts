import { Injectable } from '@nestjs/common';

import { EmailVerificationPayload } from './interfaces/email-verification.interface';
import { EmailPayload } from './interfaces/send-email.interface';
import { EmailService } from './services/email.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly emailService: EmailService) {}

  async sendEmailNotification(payload: EmailPayload): Promise<void> {
    await this.emailService.sendEmail(payload);
  }

  async sendEmailVerificationEmail(
    payload: EmailPayload<EmailVerificationPayload, void>,
  ): Promise<void> {
    await this.emailService.sendEmailVerificationEmail(payload);
  }
}
