import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import {
  NotificationType,
  Prisma,
  TaskReminderStatus,
} from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import { NotificationsService } from '@modules/notifications/notifications.service';

import { Notification } from '@modules/notifications/interfaces/notification.interface';
import { TaskReminderEntity } from './entities/task-reminder.entity';

@Injectable()
export class TaskRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async schedule(
    taskId: string,
    userId: string,
    remindAt: Date,
  ): Promise<TaskReminderEntity> {
    if (!this.isReminderTimeValid(remindAt)) {
      throw new BadRequestException('Reminder time must be in the future.');
    }

    return this.prisma.$transaction(
      async (transactionClient: Prisma.TransactionClient) => {
        // Lock db rows access for other transactions for concurrency control
        await this.lockActiveTask(taskId, userId, transactionClient);

        const reminder = await transactionClient.taskReminder.create({
          data: { taskId, remindAt },
        });

        return new TaskReminderEntity(reminder);
      },
    );
  }

  async reschedule(
    reminderId: string,
    userId: string,
    remindAt: Date,
  ): Promise<TaskReminderEntity> {
    if (!this.isReminderTimeValid(remindAt)) {
      throw new BadRequestException('Reminder time must be in the future.');
    }

    const reminder = await this.prisma.$transaction(
      async (transactionClient: Prisma.TransactionClient) => {
        // Find reminder to git it's taskId
        const reminder = await transactionClient.taskReminder.findUnique({
          where: { id: reminderId },
          select: { taskId: true },
        });

        if (!reminder) {
          throw new NotFoundException(
            `Reminder with id "${reminderId}: not found`,
          );
        }

        await this.lockActiveTask(reminder.taskId, userId, transactionClient);

        const updates =
          await transactionClient.taskReminder.updateManyAndReturn({
            where: {
              id: reminderId,
              status: TaskReminderStatus.PENDING,
              task: {
                userId,
                deletedAt: null,
              },
            },
            data: {
              status: TaskReminderStatus.CANCELED,
              canceledAt: new Date(),
            },
          });

        if (updates.length === 1) {
          const prevReminder = updates[0];

          return transactionClient.taskReminder.create({
            data: {
              taskId: prevReminder.taskId,
              remindAt,
            },
          });
        } else {
          const reminder = await transactionClient.taskReminder.findUnique({
            where: {
              id: reminderId,
              task: {
                userId,
                deletedAt: null,
              },
            },
          });

          if (!reminder) {
            throw new NotFoundException(
              `Reminder not found for id: ${reminderId}`,
            );
          }

          throw new ConflictException(
            `Reminder can't be rescheduled because it is in ${reminder.status} status.`,
          );
        }
      },
    );

    return new TaskReminderEntity(reminder);
  }

  async cancel(
    reminderId: string,
    userId: string,
  ): Promise<TaskReminderEntity | null> {
    const updateResults = await this.prisma.taskReminder.updateManyAndReturn({
      where: {
        id: reminderId,
        status: TaskReminderStatus.PENDING,
        task: {
          userId,
          deletedAt: null,
        },
      },
      data: {
        status: TaskReminderStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    if (updateResults.length) {
      return new TaskReminderEntity(updateResults[0]);
    }

    const reminder = await this.prisma.taskReminder.findUnique({
      where: {
        id: reminderId,
        status: { not: TaskReminderStatus.PENDING },
        task: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (reminder && reminder.status === TaskReminderStatus.CANCELED) {
      return new TaskReminderEntity(reminder);
    }

    if (reminder && reminder.status === TaskReminderStatus.COMPLETED) {
      throw new ConflictException('Reminder is already completed');
    }

    throw new NotFoundException('Reminder not found.');
  }

  async cancelPendingForTask(
    taskId: string,
    transactionClient: Prisma.TransactionClient,
  ): Promise<number> {
    const results = await transactionClient.taskReminder.updateMany({
      where: {
        taskId,
        status: TaskReminderStatus.PENDING,
      },
      data: {
        status: TaskReminderStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    return results.count;
  }

  async processDueReminders(): Promise<void> {
    const reminders = await this.prisma.taskReminder.findMany({
      where: {
        status: TaskReminderStatus.PENDING,
        remindAt: { lte: new Date() },
        task: {
          deletedAt: null,
        },
      },
      orderBy: { remindAt: 'asc', id: 'asc' },
      select: { id: true },
      take: 100,
    });

    for (const reminder of reminders) {
      try {
        await this.processReminder(reminder.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;

        this.logger.error(
          `Task reminder processing failed for id: ${reminder.id} with error: ${errorMessage}`,
          errorStack,
        );
      }
    }
  }

  private async processReminder(reminderId: string): Promise<void> {
    await this.prisma.$transaction(
      async (transactionClient: Prisma.TransactionClient) => {
        const reminder = await transactionClient.taskReminder.findUnique({
          where: { id: reminderId },
          select: {
            taskId: true,
            task: { select: { id: true, userId: true } },
          },
        });

        if (!reminder) {
          return;
        }

        const taskLocked = await this.lockActiveTask(
          reminder.taskId,
          reminder.task.userId,
          transactionClient,
          false,
        );

        if (!taskLocked) {
          return;
        }

        const now = new Date();
        const updates =
          await transactionClient.taskReminder.updateManyAndReturn({
            where: {
              id: reminderId,
              status: TaskReminderStatus.PENDING,
              remindAt: { lte: now },
              task: {
                deletedAt: null,
              },
            },
            include: {
              task: {
                select: { id: true, title: true, dueDate: true, userId: true },
              },
            },
            data: {
              status: TaskReminderStatus.COMPLETED,
              processedAt: now,
            },
          });

        if (updates.length === 1) {
          const reminder = updates[0];
          const task = reminder.task;
          const dueDateMessage = task.dueDate
            ? `due on ${task.dueDate.toLocaleString()}`
            : 'waiting for you.';
          const notificationMessage = `Reminder: Task "${task.title}" is ${dueDateMessage}`;
          const notificationPayload: Notification = {
            type: NotificationType.IN_APP,
            userId: task.userId,
            message: notificationMessage,
            reminderId,
          };

          // Create an in-app notification for the completed reminder
          // Use the transaction to create the notification within the same atomic operation
          await this.notificationsService.createNotification(
            notificationPayload,
            transactionClient,
          );
        }
      },
    );
  }

  private isReminderTimeValid(time: Date): boolean {
    return (
      time instanceof Date && !Number.isNaN(time.getTime()) && time > new Date()
    );
  }

  private async lockActiveTask(
    taskId: string,
    userId: string,
    transactionClient: Prisma.TransactionClient,
    throwIfNotFound = true,
  ): Promise<boolean> {
    const tasks = await transactionClient.$queryRaw<
      Pick<Prisma.TaskModel, 'id'>[]
    >`
      SELECT "id"
      FROM "Task"
      WHERE "id" = ${taskId}
        AND "userId" = ${userId}
        AND "deletedAt" IS NULL
      FOR UPDATE
    `;

    if (tasks.length === 0 && throwIfNotFound) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return tasks.length > 0;
  }
}
