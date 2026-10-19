import { BaseEntity } from '@entities/base.entity';
import { TaskReminderStatus } from '@generated/prisma';

/**
 * Entity representing a Task Reminder in the system.
 */
export class TaskReminderEntity extends BaseEntity {
  taskId: string;
  status: TaskReminderStatus;
  remindAt: Date;
  processedAt: Date | null;
  canceledAt: Date | null;
  notification: any | null; // Replace `any` with the actual Notification entity type when available

  constructor(partial: Partial<TaskReminderEntity>) {
    super();
    Object.assign(this, TaskReminderEntity.filterNullishValues(partial));
  }
}
