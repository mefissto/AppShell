import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { Prisma, TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('PATCH /tasks/:taskId/reminders/:reminderId (e2e)', () => {
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
  let invalidRemindAt: string;

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
    ownerUser = helpers.createTestUserInput('reminders-reschedule-owner');
    otherUser = helpers.createTestUserInput('reminders-reschedule-other');

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
    invalidRemindAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

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
      .patch('/tasks/random-id/reminders/random-id')
      .send()
      .expect(401);
  });

  it('returns 400 for invalid payload', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: 'invalidDate' })
      .expect(400);

    expect(response.body.message).toContain(
      'remindAt must be a timestamp with an explicit timezone (Z or ±HH:mm)',
    );
  });

  it('returns 400 if reminders time in the past', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: invalidRemindAt })
      .expect(400);

    expect(response.body.message).toContain(
      'Reminder time must be in the future.',
    );
  });

  it('returns 404 for non-existent reminder', async () => {
    const task = await createTask(ownerId);

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/non-existent-id`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);
  });

  it('returns 404 for non-existent task', async () => {
    await request(app.getHttpServer())
      .patch(`/tasks/non-existent-id/reminders/non-existent-id`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);
  });

  it('returns 404 if task belongs to another user', async () => {
    const task = await createTask(otherUserId);
    const reminder = await createReminder(task.id);

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);
  });

  it('returns 404 if reminder belongs to another task', async () => {
    const task1 = await createTask(ownerId);
    const task2 = await createTask(ownerId);
    const reminder = await createReminder(task1.id);

    await request(app.getHttpServer())
      .patch(`/tasks/${task2.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);
  });

  it('returns 404 if task is soft-deleted', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    await prisma.task.update({
      where: { id: task.id, userId: ownerId },
      data: { deletedAt: new Date() },
    });

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);
  });

  it('return 200 if reminder is successfully rescheduled', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);
    const newRemindAt = new Date(new Date(remindAt).getTime() + 60 * 60 * 1000); // 1 hour later

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: newRemindAt })
      .expect(200);

    const remindersInDb = await prisma.taskReminder.findMany({
      where: { taskId: task.id, task: { userId: ownerId } },
    });

    expect(remindersInDb.length).toBe(2);
    expect(remindersInDb).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: reminder.id,
          remindAt: new Date(remindAt),
          canceledAt: expect.any(Date),
          status: TaskReminderStatus.CANCELED,
        }),
        expect.objectContaining({
          id: expect.not.stringContaining(reminder.id),
          remindAt: newRemindAt,
          status: TaskReminderStatus.PENDING,
        }),
      ]),
    );
  });

  it('return 409 if reminder is already canceled', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    await updateReminder(reminder.id, {
      canceledAt: new Date(),
      status: TaskReminderStatus.CANCELED,
    });

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(409);

    const remindersInDb = await prisma.taskReminder.findMany({
      where: { taskId: task.id },
    });

    expect(remindersInDb).toHaveLength(1);
    expect(remindersInDb[0].id).toBe(reminder.id);
    expect(remindersInDb[0].status).toBe(TaskReminderStatus.CANCELED);
  });

  it('return 409 if reminder is already completed', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);

    await updateReminder(reminder.id, {
      processedAt: new Date(),
      status: TaskReminderStatus.COMPLETED,
    });

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(409);

    const remindersInDb = await prisma.taskReminder.findMany({
      where: { taskId: task.id },
    });

    expect(remindersInDb).toHaveLength(1);
    expect(remindersInDb[0].id).toBe(reminder.id);
    expect(remindersInDb[0].status).toBe(TaskReminderStatus.COMPLETED);
  });

  it('returns 409 if user tries to reschedule a reminder second time', async () => {
    const task = await createTask(ownerId);
    const reminder = await createReminder(task.id);
    const newRemindAt = new Date(new Date(remindAt).getTime() + 60 * 60 * 1000); // 1 hour later

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: newRemindAt })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/tasks/${task.id}/reminders/${reminder.id}`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: newRemindAt })
      .expect(409);

    const remindersInDb = await prisma.taskReminder.findMany({
      where: { taskId: task.id, task: { userId: ownerId } },
    });

    expect(remindersInDb.length).toBe(2);
    expect(remindersInDb).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: reminder.id,
          remindAt: new Date(remindAt),
          canceledAt: expect.any(Date),
          status: TaskReminderStatus.CANCELED,
        }),
        expect.objectContaining({
          id: expect.not.stringContaining(reminder.id),
          remindAt: newRemindAt,
          status: TaskReminderStatus.PENDING,
        }),
      ]),
    );
  });
});
