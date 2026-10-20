import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { TaskRemindersService } from '@modules/task-reminders/task-reminders.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('Concurrency task reminders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let cleanupRegistry: helpers.CleanupRegistry;
  let taskRemindersService: TaskRemindersService;

  let ownerUser: helpers.TestUserInput;
  let ownerId: string;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    taskRemindersService = app.get(TaskRemindersService);
  });

  beforeEach(async () => {
    cleanupRegistry = new helpers.CleanupRegistry();
    ownerUser = helpers.createTestUserInput('reminders-concurrency-owner');

    cleanupRegistry.register(async () => {
      // Remove reminders before the shared helper hard-deletes their tasks.
      await prisma.notification.deleteMany({
        where: { reminder: { task: { user: { email: ownerUser.email } } } },
      });
      await prisma.taskReminder.deleteMany({
        where: { task: { user: { email: ownerUser.email } } },
      });
      await helpers.cleanupUserByEmail(prisma, ownerUser.email);
    });

    ownerId = (await usersService.create(ownerUser)).id;
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
    remindAtDate = new Date(Date.now() + 60 * 60 * 1000),
  ) =>
    prisma.taskReminder.create({
      data: {
        taskId,
        remindAt: remindAtDate,
      },
    });

  it('processes a due reminder only once when two workers run concurrently', async () => {
    const task = await createTask(ownerId);
    const pastRemindAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in the past
    const reminder = await createReminder(task.id, pastRemindAt);

    await Promise.all([
      taskRemindersService.processDueReminders(),
      taskRemindersService.processDueReminders(),
    ]);

    const processedReminder = await prisma.taskReminder.findUniqueOrThrow({
      where: { id: reminder.id },
    });

    expect(processedReminder.status).toBe(TaskReminderStatus.COMPLETED);
    expect(processedReminder.processedAt).toBeInstanceOf(Date);

    const notifications = await prisma.notification.findMany({
      where: { reminderId: reminder.id },
    });

    expect(notifications).toHaveLength(1);
  });
});
