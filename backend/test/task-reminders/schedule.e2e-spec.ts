import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('POST /tasks/:taskId/reminders (e2e)', () => {
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
    ownerUser = helpers.createTestUserInput('reminders-schedule-owner');
    otherUser = helpers.createTestUserInput('reminders-schedule-other');

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

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer())
      .post('/tasks/random-id/reminders')
      .send()
      .expect(401);
  });

  it('returns 400 for empty payload', async () => {
    const task = await createTask(ownerId);

    const response = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(400);

    expect(response.body.message).toContain('remindAt should not be empty');
  });

  it('returns 400 for invalid payload', async () => {
    const task = await createTask(ownerId);

    const response = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: 'invalidDate' })
      .expect(400);

    expect(response.body.message).toContain(
      'remindAt must be a timestamp with an explicit timezone (Z or ±HH:mm)',
    );
  });

  it('returns 400 if reminders time in the past', async () => {
    const task = await createTask(ownerId);

    const response = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send({ remindAt: invalidRemindAt })
      .expect(400);

    expect(response.body.message).toContain(
      'Reminder time must be in the future.',
    );
  });

  it("returns 404 when task ID doesn't exist", async () => {
    const response = await request(app.getHttpServer())
      .post(`/tasks/random-task-id/reminders`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);

    expect(response.body.message).toContain(
      `Task with ID random-task-id not found`,
    );
  });

  it('returns 404 task was soft deleted', async () => {
    const now = new Date();
    const task = await createTask(ownerId);
    await prisma.task.update({
      where: {
        id: task.id,
        userId: ownerId,
      },
      data: { deletedAt: now },
    });

    const response = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);

    expect(response.body.message).toContain(
      `Task with ID ${task.id} not found`,
    );

    const remindersCount = await prisma.taskReminder.count({
      where: { taskId: task.id },
    });

    expect(remindersCount).toBe(0);
  });

  it('returns 404 when task belongs to another user', async () => {
    const task = await createTask(otherUserId);

    const response = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(404);

    expect(response.body.message).toContain(
      `Task with ID ${task.id} not found`,
    );
  });

  it('returns 201 for successfully created reminder', async () => {
    const task = await createTask(ownerId);

    const response = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send({ remindAt })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        taskId: task.id,
        remindAt,
        status: TaskReminderStatus.PENDING,
      }),
    );

    const persistedReminder = await prisma.taskReminder.findUnique({
      where: { id: response.body.id },
    });

    expect(persistedReminder).not.toBeNull();
    expect(persistedReminder).toEqual(
      expect.objectContaining({
        taskId: task.id,
        status: TaskReminderStatus.PENDING,
        remindAt: new Date(remindAt),
      }),
    );
  });
});
