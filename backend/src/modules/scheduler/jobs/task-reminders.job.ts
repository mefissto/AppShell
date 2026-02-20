import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import schedulerConfig from '@config/scheduler.config';
import { ActorType, NotificationType } from '@generated/prisma';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';
import { JobAuditAction } from '@loggers/enums/audit-actions.enum';
import { Notification } from '@modules/notifications/interfaces/notification.interface';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { TaskEntity } from '@modules/tasks/entities/task.entity';
import { TasksService } from '@modules/tasks/tasks.service';

import { JobName } from '../enums/job-name.enum';
import { SchedulerRunner } from '../scheduler.runner';

const cronTaskReminders = schedulerConfig().cronTaskReminders;

@Injectable()
export class TaskRemindersJob {
  constructor(
    private readonly runner: SchedulerRunner,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  @Cron(cronTaskReminders, { name: JobName.TaskReminders })
  async handle(): Promise<void> {
    await this.runner.execute(JobName.TaskReminders, async () => {
      // TODO: Add more precise reminder logic (e.g., only tasks that are due within the next hour, etc.)
      const tasks = await this.tasksService.findTasksWithPendingReminders();

      for (const task of tasks) {
        const dueDateMessage = task.dueDate
          ? `due on ${task.dueDate.toLocaleString()}`
          : 'with no due date';
        const notificationMessage = `Reminder: Task "${task.title}" is ${dueDateMessage}`;
        const notificationPayload: Notification = {
          userId: task.userId,
          message: notificationMessage,
          type: NotificationType.EMAIL,
        };

        // TODO: Send notification (e.g., email) to the user about the upcoming task deadline
        await this.notificationsService.createNotification(notificationPayload);

        this.auditLogger.log({
          action: JobAuditAction.TASK_REMINDERS_EXECUTION_SUCCESS,
          actorType: ActorType.SYSTEM,
          targetEntity: TaskEntity.name,
          targetEntityId: task.id,
        });

        await this.tasksService.markTaskReminderSent(task.id);
      }
    });
  }
}
