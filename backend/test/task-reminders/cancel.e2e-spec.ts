import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { Prisma, TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('DELETE /tasks/:taskId/reminders/:reminderId (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let throttlerStorage: ThrottlerStorageService;
  let cleanupRegistry: helpers.CleanupRegistry;

  let ownerUser: helpers.TestUserInput;
  let otherUser: helpers.TestUserInput;
  let ownerCookies: string[];
  let ownerId: string;
  let otherUserId: string;
  let remindAt: string;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    throttlerStorage = app.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  beforeEach(async () => {
    helpers.resetTestThrottler(throttlerStorage);

    cleanupRegistry = new helpers.CleanupRegistry();
    ownerUser = helpers.createTestUserInput('reminders-cancel-owner');
    otherUser = helpers.createTestUserInput('reminders-cancel-other');

    for (const user of [ownerUser, otherUser]) {
      cleanupRegistry.register(async () => {
        // Remove reminders before the shared helper hard-deletes their tasks.
        await prisma.taskReminder.deleteMany({
          where: { task: { user: { email: user.email } } },
        });
        await helpers.cleanupUserByEmail(prisma, user.email);
      });
    }

    remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    ownerId = (await usersService.create(ownerUser)).id;
    otherUserId = (await usersService.create(otherUser)).id;

    ownerCookies = await helpers.loginAndGetCookies(
      app,
      ownerUser.email,
      ownerUser.password,
    );
  });

  afterEach(async () => {
    await cleanupRegistry.run();
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  const createTask = async (userId: string) =>
    helpers.createTask(prisma, {
      title: 'E2E task',
      description: 'Reminder scheduling test',
      status: TaskStatus.IN_PROGRESS,
      userId,
    });

  const createReminder = async (
    taskId: string,
    remindAtDate = new Date(remindAt),
  ) =>
    prisma.taskReminder.create({
      data: {
        taskId,
        remindAt: remindAtDate,
      },
    });

  const updateReminder = async (
    reminderId: string,
    data: Prisma.TaskReminderUpdateInput,
  ) =>
    prisma.taskReminder.update({
      where: { id: reminderId },
      data,
    });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer())
      .delete('/tasks/random-id/reminders/random-id')
      .send()
      .expect(401);
  });

  it('returns 404 if the task does not exist', async () => {
    const nonExistentTaskId = 'non-existent-task-id';
    const nonExistentReminderId = 'non-existent-reminder-id';

    const response = await request(app.getHttpServer())
      .delete(`/tasks/${nonExistentTaskId}/reminders/${nonExistentReminderId}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Reminder not found');
  });

  it('returns 404 if the task is soft-deleted', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);
    await prisma.task.update({
      where: { id: task.id, userId: ownerId },
      data: { deletedAt: new Date() },
    });

    const response = await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Reminder not found');
  });

  it('returns 404 if the reminder does not exist', async () => {
    const task = await createTask(ownerId);
    const nonExistentReminderId = 'non-existent-reminder-id';

    const response = await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${nonExistentReminderId}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Reminder not found');
  });

  it('returns 404 if the task belongs to another user', async () => {
    const task = await createTask(otherUserId);
    const reminder = await createReminder(task.id);

    const response = await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Reminder not found');
  });

  it('returns 404 if the reminder belongs to another task', async () => {
    const task1 = await createTask(ownerId);
    const task2 = await createTask(ownerId);
    const reminder = await createReminder(task2.id);

    const response = await request(app.getHttpServer())
      .delete(`/tasks/${task1.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Reminder not found');
  });

  it('successfully cancels a reminder', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    const cancelledReminder = await prisma.taskReminder.findUnique({
      where: { id: reminder.id, taskId: task.id, task: { userId: ownerId } },
    });

    expect(cancelledReminder?.canceledAt).toBeInstanceOf(Date);
    expect(cancelledReminder?.status).toBe(TaskReminderStatus.CANCELED);
    expect(cancelledReminder?.processedAt).toBeNull();
  });

  it('does not do anything if the reminder is already canceled', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    const cancelledReminder = await prisma.taskReminder.findUnique({
      where: { id: reminder.id, taskId: task.id, task: { userId: ownerId } },
    });
    const firstCanceledAt = cancelledReminder?.canceledAt;

    expect(firstCanceledAt).toBeInstanceOf(Date);
    expect(cancelledReminder?.status).toBe(TaskReminderStatus.CANCELED);

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    const cancelledReminderAfterSecondDelete =
      await prisma.taskReminder.findUnique({
        where: { id: reminder.id, taskId: task.id, task: { userId: ownerId } },
      });

    expect(cancelledReminderAfterSecondDelete?.canceledAt).toEqual(
      firstCanceledAt,
    );
    expect(cancelledReminderAfterSecondDelete?.status).toBe(
      TaskReminderStatus.CANCELED,
    );
  });

  it('returns 409 if the reminder is already completed', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    // Mark the reminder as completed
    await updateReminder(reminder.id, { status: TaskReminderStatus.COMPLETED });

    const response = await request(app.getHttpServer())
      .delete(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(409);

    expect(response.body.message).toContain('Reminder is already completed');

    const completedReminder = await prisma.taskReminder.findUnique({
      where: { id: reminder.id, taskId: task.id, task: { userId: ownerId } },
    });
    expect(completedReminder?.status).toBe(TaskReminderStatus.COMPLETED);
    expect(completedReminder?.canceledAt).toBeNull();
  });
});
