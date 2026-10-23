import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { TaskRemindersService } from '@modules/task-reminders/task-reminders.service';
import { UsersService } from '@modules/users/users.service';

import { EmailTemplate } from '@enums/email-template.enum';
import { EntityType } from '@enums/entity.enum';
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
      await prisma.emailOutbox.deleteMany({
        where: {
          entityType: EntityType.TASK_REMINDER,
          entityId: {
            in: (
              await prisma.taskReminder.findMany({
                where: { task: { userId: ownerId } },
                select: { id: true },
              })
            ).map(({ id }) => id),
          },
        },
      });
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
    await clearEmailOutboxFailureTrigger();

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

  const clearEmailOutboxFailureTrigger = async () => {
    await prisma.$executeRawUnsafe(`
        DROP TRIGGER IF EXISTS test_reject_email_outbox_insert_trigger
        ON "EmailOutbox";
      `);
    await prisma.$executeRawUnsafe(`
        DROP FUNCTION IF EXISTS test_reject_email_outbox_insert();
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

  it.each([true, false, null])(
    'processes a reminder with emailNotificationsEnabled=%s',
    async (enabled) => {
      if (enabled === null) {
        await prisma.userSettings.deleteMany({ where: { userId: ownerId } });
      } else {
        await prisma.userSettings.upsert({
          where: { userId: ownerId },
          create: { userId: ownerId, emailNotificationsEnabled: enabled },
          update: { emailNotificationsEnabled: enabled },
        });
      }
      const task = await createTask(ownerId);
      const reminder = await createReminder(
        task.id,
        new Date(Date.now() - 60000),
      );

      await taskRemindersService.processDueReminders();
      await taskRemindersService.processDueReminders();

      expect(
        await prisma.taskReminder.findUniqueOrThrow({
          where: { id: reminder.id },
        }),
      ).toMatchObject({
        status: TaskReminderStatus.COMPLETED,
        processedAt: expect.any(Date) as Date,
      });
      expect(
        await prisma.notification.count({ where: { reminderId: reminder.id } }),
      ).toBe(1);
      expect(
        await prisma.emailOutbox.count({
          where: {
            entityId: reminder.id,
            entityType: EntityType.TASK_REMINDER,
          },
        }),
      ).toBe(enabled === false ? 0 : 1);
    },
  );

  it('reverts reminder processing if processing fails', async () => {
    const task = await createTask(ownerId);
    const pastRemindAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in the past
    const reminder = await createReminder(task.id, pastRemindAt);

    /*
     * Simulate notification insert failure for this reminder
     */

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
      const emailOutboxEntries = await prisma.emailOutbox.findMany({
        where: { entityId: reminder.id, entityType: EntityType.TASK_REMINDER },
      });

      expect(notifications1).toHaveLength(0);
      expect(emailOutboxEntries).toHaveLength(0);
    } finally {
      await clearNotificationFailureTrigger();
    }

    /*
     * Simulate email outbox insert failure for this reminder
     */

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION test_reject_email_outbox_insert()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Simulated email outbox insert failure';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER test_reject_email_outbox_insert_trigger
      BEFORE INSERT ON "EmailOutbox"
      FOR EACH ROW
      WHEN (NEW."entityId" = '${reminder.id}' AND NEW."entityType" = '${EntityType.TASK_REMINDER}')
      EXECUTE FUNCTION test_reject_email_outbox_insert();
    `);

    try {
      await taskRemindersService.processDueReminders();

      const reminderAfterFailure = await prisma.taskReminder.findUniqueOrThrow({
        where: { id: reminder.id },
      });

      expect(reminderAfterFailure.status).toBe(TaskReminderStatus.PENDING);
      expect(reminderAfterFailure.processedAt).toBeNull();

      const notifications2 = await prisma.notification.findMany({
        where: { reminderId: reminder.id },
      });
      const emailOutboxEntries2 = await prisma.emailOutbox.findMany({
        where: { entityId: reminder.id, entityType: EntityType.TASK_REMINDER },
      });

      expect(notifications2).toHaveLength(0);
      expect(emailOutboxEntries2).toHaveLength(0);
    } finally {
      await clearEmailOutboxFailureTrigger();
    }

    await taskRemindersService.processDueReminders();

    const processedReminder = await prisma.taskReminder.findUniqueOrThrow({
      where: { id: reminder.id },
    });

    expect(processedReminder.status).toBe(TaskReminderStatus.COMPLETED);
    expect(processedReminder.processedAt).toBeInstanceOf(Date);

    const notifications3 = await prisma.notification.findMany({
      where: { reminderId: reminder.id },
    });
    const emailOutboxEntries3 = await prisma.emailOutbox.findMany({
      where: { entityId: reminder.id, entityType: EntityType.TASK_REMINDER },
    });

    expect(notifications3).toHaveLength(1);
    expect(emailOutboxEntries3).toHaveLength(1);
    expect(emailOutboxEntries3).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: ownerUser.email,
          subject: expect.stringContaining(task.title) as string,
          payload: expect.objectContaining({
            template: EmailTemplate.TASK_REMINDER,
            data: expect.objectContaining({
              taskTitle: task.title,
              taskDueDate: task.dueDate?.toISOString() ?? null,
            }) as unknown,
          }) as unknown,
          entityId: reminder.id,
          entityType: EntityType.TASK_REMINDER,
        }),
      ]),
    );

    await taskRemindersService.processDueReminders();

    expect(
      await prisma.emailOutbox.count({
        where: {
          entityType: EntityType.TASK_REMINDER,
          entityId: reminder.id,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.notification.count({
        where: { reminderId: reminder.id },
      }),
    ).toBe(1);
  });
});
