import {
  EmailOutboxStatus,
  TaskReminderStatus,
  TaskStatus,
} from '@generated/prisma';
import { EntityType } from '@enums/entity.enum';
import { EmailOutboxService } from '@modules/email-outbox/email-outbox.service';
import { TasksService } from '@modules/tasks/tasks.service';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('DELETE /tasks/:id (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let throttlerStorage: ThrottlerStorageService;
  let cleanupRegistry: helpers.CleanupRegistry;

  let ownerUser: helpers.TestUserInput;
  let otherUser: helpers.TestUserInput;
  let ownerCookies: string[];
  let otherCookies: string[];
  let ownerId: string;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    throttlerStorage = app.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  beforeEach(async () => {
    // Reset hit history and timers as well as visible storage between tests.
    helpers.resetTestThrottler(throttlerStorage);

    cleanupRegistry = new helpers.CleanupRegistry();
    ownerUser = helpers.createTestUserInput('tasks-delete-owner');
    otherUser = helpers.createTestUserInput('tasks-delete-other');

    cleanupRegistry.register(async () => {
      await prisma.taskReminder.deleteMany({
        where: { task: { userId: ownerId } },
      });
      await helpers.cleanupUserByEmail(prisma, ownerUser.email);
    });

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, otherUser.email);
    });

    await usersService.create(ownerUser);
    await usersService.create(otherUser);

    ownerId = (await usersService.findUnique({ email: ownerUser.email }))!.id;

    ownerCookies = await helpers.loginAndGetCookies(
      app,
      ownerUser.email,
      ownerUser.password,
    );

    otherCookies = await helpers.loginAndGetCookies(
      app,
      otherUser.email,
      otherUser.password,
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanupRegistry.run();
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer()).delete('/tasks/some-id').expect(401);
  });

  it('deletes a task for the owner', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Task to delete',
        status: TaskStatus.PENDING,
        userId: ownerId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set('Cookie', ownerCookies)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set('Cookie', ownerCookies)
      .expect(404);
  });

  it('returns 404 when deleting another user task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Private task',
        status: TaskStatus.PENDING,
        userId: ownerId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set('Cookie', otherCookies)
      .expect(404);
  });

  const createTaskWithQueuedEmails = async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Task with reminder emails',
        status: TaskStatus.PENDING,
        userId: ownerId,
      },
    });
    const reminders = await Promise.all(
      [TaskReminderStatus.PENDING, TaskReminderStatus.COMPLETED].map((status) =>
        prisma.taskReminder.create({
          data: {
            taskId: task.id,
            status,
            remindAt: new Date(Date.now() + 3600000),
          },
        }),
      ),
    );
    const emails = await Promise.all(
      reminders.map((reminder, index) =>
        prisma.emailOutbox.create({
          data: {
            to: ownerUser.email,
            subject: 'Queued reminder',
            payload: {},
            entityType: EntityType.TASK_REMINDER,
            entityId: reminder.id,
            status:
              index === 0
                ? EmailOutboxStatus.PENDING
                : EmailOutboxStatus.PROCESSING,
            claimToken: index === 1 ? 'existing-worker' : null,
            lockedUntil: index === 1 ? new Date(Date.now() + 300000) : null,
          },
        }),
      ),
    );
    return { task, reminders, emails };
  };

  it('atomically soft deletes the task and cancels queued emails for pending and completed reminders', async () => {
    // Arrange: completed reminder processing does not imply its email has been delivered.
    const { task, reminders, emails } = await createTaskWithQueuedEmails();

    // Act
    await request(app.getHttpServer())
      .delete('/tasks/' + task.id)
      .set('Cookie', ownerCookies)
      .expect(204);

    // Assert: findUniqueOrThrow bypasses the extension that hides deleted tasks.
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
        .deletedAt,
    ).toBeInstanceOf(Date);
    expect(
      await prisma.taskReminder.findUniqueOrThrow({
        where: { id: reminders[0].id },
      }),
    ).toMatchObject({
      status: TaskReminderStatus.CANCELED,
      canceledAt: expect.any(Date) as Date,
    });
    expect(
      await prisma.taskReminder.findUniqueOrThrow({
        where: { id: reminders[1].id },
      }),
    ).toEqual(reminders[1]);
    for (const email of emails) {
      expect(
        await prisma.emailOutbox.findUniqueOrThrow({ where: { id: email.id } }),
      ).toMatchObject({
        status: EmailOutboxStatus.CANCELED,
        canceledAt: expect.any(Date) as Date,
        claimToken: null,
        lockedUntil: null,
      });
    }
  });

  it('leaves task reminders and emails unchanged when another user attempts deletion', async () => {
    // Arrange
    const { task, reminders, emails } = await createTaskWithQueuedEmails();

    // Act
    await request(app.getHttpServer())
      .delete('/tasks/' + task.id)
      .set('Cookie', otherCookies)
      .expect(404);

    // Assert
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
        .deletedAt,
    ).toBeNull();
    for (const reminder of reminders)
      expect(
        await prisma.taskReminder.findUniqueOrThrow({
          where: { id: reminder.id },
        }),
      ).toEqual(reminder);
    for (const email of emails)
      expect(
        await prisma.emailOutbox.findUniqueOrThrow({ where: { id: email.id } }),
      ).toEqual(email);
  });

  it('rolls back task deletion and reminder cancellation when email cancellation fails', async () => {
    // Arrange: execute real cancellation writes, then fail before the transaction commits.
    const { task, reminders, emails } = await createTaskWithQueuedEmails();
    const outbox = app.get(EmailOutboxService);
    const cancelForReminders = outbox.cancelForReminders.bind(
      outbox,
    ) as EmailOutboxService['cancelForReminders'];
    const error = new Error('Email cancellation failed');
    jest
      .spyOn(outbox, 'cancelForReminders')
      .mockImplementationOnce(async (ids, tx) => {
        await cancelForReminders(ids, tx);
        throw error;
      });

    // Act
    const deletion = app.get(TasksService).softDelete(task.id, ownerId);

    // Assert: every write used the same PostgreSQL transaction and must be rolled back.
    await expect(deletion).rejects.toBe(error);
    expect(
      (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
        .deletedAt,
    ).toBeNull();
    for (const reminder of reminders)
      expect(
        await prisma.taskReminder.findUniqueOrThrow({
          where: { id: reminder.id },
        }),
      ).toEqual(reminder);
    for (const email of emails)
      expect(
        await prisma.emailOutbox.findUniqueOrThrow({ where: { id: email.id } }),
      ).toEqual(email);
  });
});
