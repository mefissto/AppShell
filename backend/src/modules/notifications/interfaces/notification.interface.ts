import { NotificationType, Prisma } from '@generated/prisma';

export declare interface Notification {
  userId: string;
  type: NotificationType;
  message: string;
  reminderId?: string;
  read?: boolean;
  payload?: Prisma.JsonValue;
}
