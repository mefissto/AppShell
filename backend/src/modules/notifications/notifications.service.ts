import { Injectable } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@generated/prisma';

import { Notification } from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(
    notification: Notification,
    transactionClient?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = transactionClient ?? this.prisma;

    await client.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        payload: notification.payload ?? undefined,
        reminderId: notification.reminderId,
      },
    });
  }
}
