import { BaseEntity } from '@entities/base.entity';
import { TaskReminderStatus, TaskStatus } from '@generated/prisma';

/**
 * Entity representing a Task in the system.
 */
export class TaskEntity extends BaseEntity {
  title: string;
  description: string | null;
  userId: string;
  status: TaskStatus;
  dueDate: Date | null;
  remindAt: Date | null;
  reminderStatus: TaskReminderStatus;
  tagIds: string[];

  constructor(partial: Partial<TaskEntity>) {
    super();
    Object.assign(this, TaskEntity.filterNullishValues(partial));
  }
}
