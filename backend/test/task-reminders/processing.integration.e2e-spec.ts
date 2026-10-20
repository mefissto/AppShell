import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { TaskRemindersService } from '@modules/task-reminders/task-reminders.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('Processing task reminders (e2e)', () => {
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
    ownerUser = helpers.createTestUserInput('reminders-processing-owner');

    cleanupRegistry.register(async () => {
      // Remove reminders before the shared helper hard-deletes their tasks.
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
    await clearNotificationFailureTrigger();

    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  const clearNotificationFailureTrigger = async () => {
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS test_reject_notification_insert_trigger
      ON "Notification";
    `);
    await prisma.$executeRawUnsafe(`
      DROP FUNCTION IF EXISTS test_reject_notification_insert();
    `);
  };

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

  it('reverts reminder processing if processing fails', async () => {
    const task = await createTask(ownerId);
    const pastRemindAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in the past
    const reminder = await createReminder(task.id, pastRemindAt);

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_reject_notification_insert()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Simulated notification insert failure';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER test_reject_notification_insert_trigger
      BEFORE INSERT ON "Notification"
      FOR EACH ROW
      WHEN (NEW."reminderId" = '${reminder.id}')
      EXECUTE FUNCTION test_reject_notification_insert();
    `);

    try {
      await taskRemindersService.processDueReminders();

      const reminderAfterFailure = await prisma.taskReminder.findUniqueOrThrow({
        where: { id: reminder.id },
      });

      expect(reminderAfterFailure.status).toBe(TaskReminderStatus.PENDING);
      expect(reminderAfterFailure.processedAt).toBeNull();

      const notifications1 = await prisma.notification.findMany({
        where: { reminderId: reminder.id },
      });

      expect(notifications1).toHaveLength(0);
    } finally {
      await clearNotificationFailureTrigger();
    }

    await taskRemindersService.processDueReminders();

    const processedReminder = await prisma.taskReminder.findUniqueOrThrow({
      where: { id: reminder.id },
    });

    expect(processedReminder.status).toBe(TaskReminderStatus.COMPLETED);
    expect(processedReminder.processedAt).toBeInstanceOf(Date);

    const notifications2 = await prisma.notification.findMany({
      where: { reminderId: reminder.id },
    });

    expect(notifications2).toHaveLength(1);

    await taskRemindersService.processDueReminders();

    const notifications3 = await prisma.notification.findMany({
      where: { reminderId: reminder.id },
    });

    expect(notifications3).toHaveLength(1);
  });
});
