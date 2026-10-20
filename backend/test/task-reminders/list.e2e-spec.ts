import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { Prisma, TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('GET /tasks/:taskId/reminders (e2e)', () => {
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
    ownerUser = helpers.createTestUserInput('reminders-list-owner');
    otherUser = helpers.createTestUserInput('reminders-list-other');

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
      .get('/tasks/random-id/reminders')
      .send()
      .expect(401);
  });

  it('returns 404 if the task does not exist', async () => {
    const nonExistentTaskId = 'non-existent-task-id';

    const response = await request(app.getHttpServer())
      .get(`/tasks/${nonExistentTaskId}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Task not found');
  });

  it('returns 404 if task belongs to another user', async () => {
    const task = await createTask(otherUserId);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Task not found');
    const taskInDb = await prisma.task.findUnique({
      where: { id: task.id, userId: otherUserId },
    });
    expect(taskInDb).not.toBeNull();
  });

  it('returns 404 if task is soft-deleted', async () => {
    const task = await createTask(ownerId);
    await prisma.task.update({
      where: { id: task.id, userId: ownerId },
      data: { deletedAt: new Date() },
    });

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(404);

    expect(response.body.message).toContain('Task not found');
    const deletedTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id, userId: ownerId },
    });
    expect(deletedTask?.deletedAt).not.toBeNull();
  });

  it('returns 200 with empty reminders array', async () => {
    const task = await createTask(ownerId);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  it('returns 200 with reminders for a task', async () => {
    const task = await createTask(ownerId);
    const reminder1 = await createReminder(task.id);
    const reminder2 = await createReminder(task.id);

    const otherTask = await createTask(otherUserId);
    await createReminder(otherTask.id);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(
      response.body.map((reminder: { id: string }) => reminder.id),
    ).toEqual(expect.arrayContaining([reminder1.id, reminder2.id]));
  });

  it('returns 200 with reminders for a task and correct statuses', async () => {
    const task = await createTask(ownerId);
    const reminder1 = await createReminder(task.id);
    const reminder2 = await createReminder(task.id);
    const reminder3 = await createReminder(task.id);

    await updateReminder(reminder2.id, {
      status: TaskReminderStatus.COMPLETED,
    });
    await updateReminder(reminder3.id, {
      status: TaskReminderStatus.CANCELED,
    });

    const otherTask = await createTask(otherUserId);
    await createReminder(otherTask.id);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    expect(response.body).toHaveLength(3);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: reminder1.id,
          status: TaskReminderStatus.PENDING,
        }),
        expect.objectContaining({
          id: reminder2.id,
          status: TaskReminderStatus.COMPLETED,
        }),
        expect.objectContaining({
          id: reminder3.id,
          status: TaskReminderStatus.CANCELED,
        }),
      ]),
    );
  });

  it('returns 200 with reminders for a single task for the owner', async () => {
    const task1 = await createTask(ownerId);
    const task2 = await createTask(ownerId);

    const reminder1 = await createReminder(task1.id);
    const reminder2 = await createReminder(task1.id);
    const reminder3 = await createReminder(task2.id);
    const reminder4 = await createReminder(task2.id);

    const otherTask = await createTask(otherUserId);
    await createReminder(otherTask.id);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task1.id}/reminders`)
      .set('Cookie', ownerCookies)
      .send()
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(
      response.body.map((reminder: { id: string }) => reminder.id),
    ).toEqual(expect.arrayContaining([reminder1.id, reminder2.id]));
  });

  it('returns 200 with an ordered list of reminders', async () => {
    const task = await createTask(ownerId);

    const later = await createReminder(
      task.id,
      new Date(Date.now() + 3 * 60 * 60 * 1000),
    );
    const earlier = await createReminder(
      task.id,
      new Date(Date.now() + 1 * 60 * 60 * 1000),
    );
    const middle = await createReminder(
      task.id,
      new Date(Date.now() + 2 * 60 * 60 * 1000),
    );

    const response = await request(app.getHttpServer())
      .get(`/tasks/${task.id}/reminders`)
      .set('Cookie', ownerCookies)
      .expect(200);

    expect(
      response.body.map((reminder: { id: string }) => reminder.id),
    ).toEqual([earlier.id, middle.id, later.id]);
  });
});
