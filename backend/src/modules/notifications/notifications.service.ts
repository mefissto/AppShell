import { Injectable } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';

import { EmailVerificationPayload } from './interfaces/email-verification.interface';
import { Notification } from './interfaces/notification.interface';
import { EmailPayload } from './interfaces/send-email.interface';
import { EmailService } from './services/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async sendEmailNotification(payload: EmailPayload): Promise<void> {
    await this.emailService.sendEmail(payload);
  }

  async sendEmailVerificationEmail(
    payload: EmailPayload<EmailVerificationPayload, void>,
  ): Promise<void> {
    await this.emailService.sendEmailVerificationEmail(payload);
  }

  async createNotification(notification: Notification): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        payload: notification.payload ?? undefined,
      },
    });
  }
}
