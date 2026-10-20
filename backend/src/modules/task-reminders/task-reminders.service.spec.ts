import { PrismaService } from '@database/prisma.service';
import {
  NotificationType,
  Prisma,
  TaskReminderStatus as Status,
} from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';
import { TaskAuditAction } from '@loggers/enums/audit-actions.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { TasksService } from '@modules/tasks/tasks.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaginationService } from '@pagination/services/pagination.service';
import { TaskReminderEntity } from './entities/task-reminder.entity';
import { TaskRemindersService } from './task-reminders.service';

const delegate = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  updateManyAndReturn: jest.fn(),
  updateMany: jest.fn(),
});

describe('TaskRemindersService', () => {
  let service: TaskRemindersService;
  let prisma: {
    $transaction: jest.Mock;
    task: { findFirst: jest.Mock };
    taskReminder: ReturnType<typeof delegate>;
  };
  let tx: { $queryRaw: jest.Mock; taskReminder: ReturnType<typeof delegate> };
  let logger: { error: jest.Mock };
  let notifications: { createNotification: jest.Mock };

  const now = new Date('2026-10-19T10:00:00Z');
  const future = new Date('2026-10-19T11:00:00Z');
  const row = (status: Status = Status.PENDING) => ({
    id: 'r1',
    taskId: 't1',
    status,
    remindAt: future,
    createdAt: now,
    updatedAt: now,
    canceledAt: null,
    processedAt: null,
  });
  const task = {
    id: 't1',
    userId: 'u1',
    title: 'Review',
    dueDate: null as Date | null,
  };
  const pendingWhere = {
    taskId: 't1',
    id: 'r1',
    status: Status.PENDING,
    task: { userId: 'u1', deletedAt: null },
  };
  const canceledData = { status: Status.CANCELED, canceledAt: now };
  const client = () => tx as unknown as Prisma.TransactionClient;

  // Check the tagged SQL and its bound ownership parameters.
  const expectLock = () => {
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = tx.$queryRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...string[],
    ];
    expect(strings.join('?').replace(/\s+/g, ' ').trim()).toBe(
      'SELECT "id" FROM "Task" WHERE "id" = ? AND "userId" = ? AND "deletedAt" IS NULL FOR UPDATE',
    );
    expect(values).toEqual(['t1', 'u1']);
  };
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    prisma = {
      $transaction: jest.fn(),
      task: { findFirst: jest.fn() },
      taskReminder: delegate(),
    };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 't1' }]),
      taskReminder: delegate(),
    };
    // Execute interactive callbacks with a separate transaction client.
    prisma.$transaction.mockImplementation(
      async (callback: (c: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(client()),
    );
    logger = { error: jest.fn() };
    notifications = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        TaskRemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: LoggerService, useValue: logger },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get(TaskRemindersService);
  });

  afterEach(() => jest.useRealTimers());

  describe('findAllForTask', () => {
    it('returns reminder entities in database order with ownership and active-task filters', async () => {
      // Arrange: listing includes pending and historical reminders.
      const reminders = [
        {
          ...row(Status.COMPLETED),
          id: 'completed',
          remindAt: now,
          processedAt: now,
        },
        { ...row(Status.CANCELED), id: 'canceled', canceledAt: now },
        { ...row(), id: 'pending' },
      ];
      prisma.task.findFirst.mockResolvedValueOnce({ id: 't1' });
      prisma.taskReminder.findMany.mockResolvedValueOnce(reminders);

      // Act
      const result = await service.findAllForTask('t1', 'u1');

      // Assert: Prisma handles sorting; the service maps each row to an entity.
      expect(prisma.task.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 't1', userId: 'u1', deletedAt: null },
        select: { id: true },
      });
      expect(prisma.taskReminder.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.taskReminder.findMany).toHaveBeenCalledWith({
        where: { taskId: 't1', task: { userId: 'u1', deletedAt: null } },
        orderBy: { remindAt: 'asc' },
      });
      expect(result).toEqual(
        reminders.map((reminder) => new TaskReminderEntity(reminder)),
      );
      expect(result.map((reminder) => reminder.id)).toEqual([
        'completed',
        'canceled',
        'pending',
      ]);
      result.forEach((reminder, index) => {
        expect(reminder).toBeInstanceOf(TaskReminderEntity);
        expect(reminder).not.toBe(reminders[index]);
      });
      expect(prisma.task.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.taskReminder.findMany.mock.invocationCallOrder[0],
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('returns an empty array for an accessible task without reminders', async () => {
      // Arrange
      prisma.task.findFirst.mockResolvedValueOnce({ id: 't1' });
      prisma.taskReminder.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await service.findAllForTask('t1', 'u1');

      // Assert
      expect(result).toEqual([]);
      expect(prisma.taskReminder.findMany).toHaveBeenCalledTimes(1);
    });

    it('rejects a missing, foreign-owned, or deleted task before querying reminders', async () => {
      // Arrange: all three cases yield no row for the scoped task query.
      prisma.task.findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.findAllForTask('t1', 'u1')).rejects.toThrow(
        new NotFoundException('Task not found'),
      );
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 't1', userId: 'u1', deletedAt: null },
        select: { id: true },
      });
      expect(prisma.taskReminder.findMany).not.toHaveBeenCalled();
    });

    it('propagates task lookup failure without querying reminders', async () => {
      // Arrange
      const error = new Error('task lookup failed');
      prisma.task.findFirst.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.findAllForTask('t1', 'u1')).rejects.toBe(error);
      expect(prisma.taskReminder.findMany).not.toHaveBeenCalled();
    });

    it('propagates reminder lookup failure unchanged', async () => {
      // Arrange
      const error = new Error('reminder lookup failed');
      prisma.task.findFirst.mockResolvedValueOnce({ id: 't1' });
      prisma.taskReminder.findMany.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.findAllForTask('t1', 'u1')).rejects.toBe(error);
      expect(prisma.taskReminder.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe.each(['schedule', 'reschedule'] as const)(
    '%s common guards',
    (method) => {
      it.each([
        new Date(now.getTime() - 1),
        now,
        new Date(NaN),
        future.toISOString(),
        null,
        undefined,
        future.getTime(),
      ])(
        'rejects invalid time %s before opening a transaction',
        async (value) => {
          // Act & Assert: verify the public method outcome.
          await expect(
            method === 'schedule'
              ? service.schedule('t1', 'u1', value as Date)
              : service.reschedule('r1', 't1', 'u1', value as Date),
          ).rejects.toThrow(BadRequestException);
          expect(prisma.$transaction).not.toHaveBeenCalled();
        },
      );

      it('propagates transaction failure unchanged', async () => {
        // Arrange
        const error = new Error('transaction failed');
        prisma.$transaction.mockRejectedValueOnce(error);

        // Act & Assert: verify the public method outcome.
        await expect(
          method === 'schedule'
            ? service.schedule('t1', 'u1', future)
            : service.reschedule('r1', 't1', 'u1', future),
        ).rejects.toBe(error);
      });
    },
  );

  describe('schedule', () => {
    it('locks the active owned task before creating the reminder on the transaction client', async () => {
      // Arrange
      tx.taskReminder.create.mockResolvedValueOnce(row());

      // Act
      const result = await service.schedule('t1', 'u1', future);

      // Assert
      expect(result).toBeInstanceOf(TaskReminderEntity);
      expect(result).toMatchObject({
        id: 'r1',
        taskId: 't1',
        status: Status.PENDING,
        remindAt: future,
      });
      expectLock();
      expect(tx.taskReminder.create).toHaveBeenCalledWith({
        data: { taskId: 't1', remindAt: future },
      });
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.taskReminder.create.mock.invocationCallOrder[0],
      );
      expect(prisma.taskReminder.create).not.toHaveBeenCalled();
    });

    it('rejects when no active owned task can be locked', async () => {
      // Missing, foreign-owned and deleted tasks all yield no rows for this SQL predicate.
      // Arrange
      tx.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert: verify the public method outcome.
      await expect(service.schedule('t1', 'u1', future)).rejects.toThrow(
        NotFoundException,
      );
      expectLock();
      expect(tx.taskReminder.create).not.toHaveBeenCalled();
    });

    it.each(['lock', 'create'])('propagates %s failure', async (stage) => {
      // Arrange
      const error = new Error(stage);
      if (stage === 'lock') tx.$queryRaw.mockRejectedValueOnce(error);
      else tx.taskReminder.create.mockRejectedValueOnce(error);

      // Act & Assert: verify the public method outcome.
      await expect(service.schedule('t1', 'u1', future)).rejects.toBe(error);
      if (stage === 'lock')
        expect(tx.taskReminder.create).not.toHaveBeenCalled();
    });
  });

  describe('reschedule', () => {
    beforeEach(() => {
      tx.taskReminder.findUnique.mockResolvedValueOnce({ taskId: 't1' });
    });

    it('cancels the old pending row and creates a replacement after locking', async () => {
      // Arrange
      tx.taskReminder.updateManyAndReturn.mockResolvedValueOnce([
        row(Status.CANCELED),
      ]);
      tx.taskReminder.create.mockResolvedValueOnce({
        ...row(),
        id: 'replacement',
      });

      // Act
      const result = await service.reschedule('r1', 't1', 'u1', future);

      // Assert
      expect(result).toBeInstanceOf(TaskReminderEntity);
      expect(result).toMatchObject({
        id: 'replacement',
        status: Status.PENDING,
        remindAt: future,
      });
      expect(tx.taskReminder.findUnique).toHaveBeenCalledWith({
        where: { id: 'r1', taskId: 't1' },
      });
      expectLock();
      expect(tx.taskReminder.updateManyAndReturn).toHaveBeenCalledWith({
        where: pendingWhere,
        data: canceledData,
      });
      expect(tx.taskReminder.create).toHaveBeenCalledWith({
        data: { taskId: 't1', remindAt: future },
      });
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.taskReminder.updateManyAndReturn.mock.invocationCallOrder[0],
      );
      expect(
        tx.taskReminder.updateManyAndReturn.mock.invocationCallOrder[0],
      ).toBeLessThan(tx.taskReminder.create.mock.invocationCallOrder[0]);
      expect(prisma.taskReminder.create).not.toHaveBeenCalled();
    });

    it('rejects a missing reminder before locking', async () => {
      // Arrange
      tx.taskReminder.findUnique.mockReset().mockResolvedValueOnce(null);

      // Act & Assert: verify the public method outcome.
      await expect(
        service.reschedule('r1', 't1', 'u1', future),
      ).rejects.toThrow(NotFoundException);
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.taskReminder.updateManyAndReturn).not.toHaveBeenCalled();
    });

    it('rejects an inaccessible task without mutating reminders', async () => {
      // Arrange
      tx.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert: verify the public method outcome.
      await expect(
        service.reschedule('r1', 't1', 'u1', future),
      ).rejects.toThrow(NotFoundException);
      expectLock();
      expect(tx.taskReminder.updateManyAndReturn).not.toHaveBeenCalled();
      expect(tx.taskReminder.create).not.toHaveBeenCalled();
    });

    it.each([Status.CANCELED, Status.COMPLETED, Status.SENT])(
      'reports conflict if a competing operation leaves %s',
      async (status) => {
        // Arrange
        tx.taskReminder.updateManyAndReturn.mockResolvedValueOnce([]);
        tx.taskReminder.findUnique.mockResolvedValueOnce(row(status));

        // Act & Assert: verify the public method outcome.
        await expect(
          service.reschedule('r1', 't1', 'u1', future),
        ).rejects.toThrow(
          new ConflictException(
            `Reminder can't be rescheduled because it is in ${status} status.`,
          ),
        );
        expect(tx.taskReminder.findUnique).toHaveBeenLastCalledWith({
          where: {
            id: 'r1',
            taskId: 't1',
            task: { userId: 'u1', deletedAt: null },
          },
        });
        expect(tx.taskReminder.create).not.toHaveBeenCalled();
      },
    );

    it('reports not found when the fallback reminder disappears', async () => {
      // Arrange
      tx.taskReminder.updateManyAndReturn.mockResolvedValueOnce([]);
      tx.taskReminder.findUnique.mockResolvedValueOnce(null);

      // Act & Assert: verify the public method outcome.
      await expect(
        service.reschedule('r1', 't1', 'u1', future),
      ).rejects.toThrow(NotFoundException);
      expect(tx.taskReminder.create).not.toHaveBeenCalled();
    });

    it.each(['lookup', 'lock', 'update', 'replacement'])(
      'propagates %s failure',
      async (stage) => {
        // Arrange
        const error = new Error(stage);
        tx.taskReminder.updateManyAndReturn.mockResolvedValue([
          row(Status.CANCELED),
        ]);
        if (stage === 'lookup')
          tx.taskReminder.findUnique.mockReset().mockRejectedValueOnce(error);
        if (stage === 'lock') tx.$queryRaw.mockRejectedValueOnce(error);
        if (stage === 'update')
          tx.taskReminder.updateManyAndReturn.mockRejectedValueOnce(error);
        if (stage === 'replacement')
          tx.taskReminder.create.mockRejectedValueOnce(error);

        // Act & Assert: verify the public method outcome.
        await expect(service.reschedule('r1', 't1', 'u1', future)).rejects.toBe(
          error,
        );
        if (stage !== 'replacement')
          expect(tx.taskReminder.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('cancel', () => {
    it('conditionally cancels an owned pending reminder', async () => {
      // Arrange
      prisma.taskReminder.updateManyAndReturn.mockResolvedValueOnce([
        { ...row(Status.CANCELED), canceledAt: now },
      ]);

      // Act
      const result = await service.cancel('r1', 't1', 'u1');

      // Assert
      expect(result).toBeInstanceOf(TaskReminderEntity);
      expect(result).toMatchObject({
        status: Status.CANCELED,
        canceledAt: now,
      });
      expect(prisma.taskReminder.updateManyAndReturn).toHaveBeenCalledWith({
        where: pendingWhere,
        data: canceledData,
      });
      expect(prisma.taskReminder.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([
      [Status.CANCELED, null],
      [Status.COMPLETED, ConflictException],
      [Status.SENT, NotFoundException],
      [null, NotFoundException],
    ] as const)('handles fallback state %s', async (status, exception) => {
      // Arrange
      prisma.taskReminder.updateManyAndReturn.mockResolvedValueOnce([]);
      prisma.taskReminder.findUnique.mockResolvedValueOnce(
        status ? row(status) : null,
      );

      // Act
      const result = service.cancel('r1', 't1', 'u1');

      // Assert
      if (exception) await expect(result).rejects.toThrow(exception);
      else
        expect(await result).toMatchObject({
          id: 'r1',
          status: Status.CANCELED,
        });
      expect(prisma.taskReminder.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'r1',
          status: { not: Status.PENDING },
          taskId: 't1',
          task: { userId: 'u1', deletedAt: null },
        },
      });
    });

    it.each(['update', 'lookup'])('propagates %s failure', async (stage) => {
      // Arrange
      const error = new Error(stage);
      prisma.taskReminder.updateManyAndReturn.mockResolvedValueOnce([]);
      if (stage === 'update')
        prisma.taskReminder.updateManyAndReturn
          .mockReset()
          .mockRejectedValueOnce(error);
      else prisma.taskReminder.findUnique.mockRejectedValueOnce(error);

      // Act & Assert: verify the public method outcome.
      await expect(service.cancel('r1', 't1', 'u1')).rejects.toBe(error);
    });
  });

  describe('cancelPendingForTask', () => {
    it.each([0, 3])(
      'returns %i canceled rows using only the supplied transaction',
      async (count) => {
        // Arrange
        tx.taskReminder.updateMany.mockResolvedValueOnce({ count });

        // Act & Assert: verify the public method outcome.
        await expect(
          service.cancelPendingForTask('t1', client()),
        ).resolves.toBe(count);
        expect(tx.taskReminder.updateMany).toHaveBeenCalledWith({
          where: { taskId: 't1', status: Status.PENDING },
          data: canceledData,
        });
        expect(prisma.taskReminder.updateMany).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('propagates failure to the deleting transaction', async () => {
      // Arrange
      const error = new Error('cancel failed');
      tx.taskReminder.updateMany.mockRejectedValueOnce(error);

      // Act & Assert: verify the public method outcome.
      await expect(service.cancelPendingForTask('t1', client())).rejects.toBe(
        error,
      );
    });
  });

  describe('processDueReminders', () => {
    beforeEach(() => {
      prisma.taskReminder.findMany.mockResolvedValue([{ id: 'r1' }]);
      tx.taskReminder.findUnique.mockResolvedValue({ taskId: 't1', task });
      tx.taskReminder.updateManyAndReturn.mockResolvedValue([
        { ...row(Status.COMPLETED), task },
      ]);
    });

    it('selects at most 100 due pending reminders for active tasks in deterministic order', async () => {
      // Arrange
      prisma.taskReminder.findMany.mockResolvedValueOnce([]);

      // Act
      await service.processDueReminders();

      // Assert
      expect(prisma.taskReminder.findMany).toHaveBeenCalledWith({
        where: {
          status: Status.PENDING,
          remindAt: { lte: now },
          task: { deletedAt: null },
        },
        orderBy: [{ remindAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
        take: 100,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it.each([null, new Date('2026-10-20T12:00:00Z')])(
      'completes and notifies in the same transaction (due date %s)',
      async (dueDate) => {
        // Arrange
        tx.taskReminder.updateManyAndReturn.mockResolvedValueOnce([
          { ...row(Status.COMPLETED), task: { ...task, dueDate } },
        ]);

        // Act
        await service.processDueReminders();
        expectLock();

        // Assert
        expect(tx.taskReminder.findUnique).toHaveBeenCalledWith({
          where: { id: 'r1' },
          select: {
            taskId: true,
            task: { select: { userId: true } },
          },
        });
        expect(tx.taskReminder.updateManyAndReturn).toHaveBeenCalledWith({
          where: {
            id: 'r1',
            status: Status.PENDING,
            remindAt: { lte: now },
            task: { deletedAt: null },
          },
          include: {
            task: {
              select: { title: true, dueDate: true, userId: true },
            },
          },
          data: { status: Status.COMPLETED, processedAt: now },
        });
        expect(notifications.createNotification).toHaveBeenCalledTimes(1);
        expect(notifications.createNotification).toHaveBeenCalledWith(
          {
            type: NotificationType.IN_APP,
            userId: 'u1',
            reminderId: 'r1',
            message: `Reminder: Task "Review" is ${dueDate ? `due on ${dueDate.toLocaleString()}` : 'waiting for you.'}`,
          },
          tx,
        );
        expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
          tx.taskReminder.updateManyAndReturn.mock.invocationCallOrder[0],
        );
        expect(
          tx.taskReminder.updateManyAndReturn.mock.invocationCallOrder[0],
        ).toBeLessThan(
          notifications.createNotification.mock.invocationCallOrder[0],
        );
        expect(prisma.taskReminder.updateManyAndReturn).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
      },
    );

    it('skips a reminder removed after selection', async () => {
      // Arrange
      tx.taskReminder.findUnique.mockResolvedValueOnce(null);

      // Act
      await service.processDueReminders();

      // Assert
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.taskReminder.updateManyAndReturn).not.toHaveBeenCalled();
      expect(notifications.createNotification).not.toHaveBeenCalled();
    });

    it('skips a task deleted before acquiring the lock', async () => {
      // Arrange
      tx.$queryRaw.mockResolvedValueOnce([]);

      // Act
      await service.processDueReminders();

      // Assert
      expect(tx.taskReminder.updateManyAndReturn).not.toHaveBeenCalled();
      expect(notifications.createNotification).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('does not notify after losing a race to completion, cancellation, or rescheduling', async () => {
      // Supplies the conditional-update outcome without simulating database locking.
      // Arrange
      tx.taskReminder.updateManyAndReturn.mockResolvedValueOnce([]);

      // Act
      await service.processDueReminders();

      // Assert
      expect(notifications.createNotification).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it.each([
      'transaction',
      'lookup',
      'lock',
      'update',
      'notification',
      'non-Error',
    ])('isolates %s failure and continues in selected order', async (stage) => {
      // Arrange
      const error =
        stage === 'non-Error' ? 'unavailable' : new Error(`${stage} failed`);
      prisma.taskReminder.findMany.mockResolvedValueOnce([
        { id: 'first' },
        { id: 'second' },
      ]);
      if (stage === 'transaction')
        prisma.$transaction.mockRejectedValueOnce(error);
      if (stage === 'lookup')
        tx.taskReminder.findUnique.mockRejectedValueOnce(error);
      if (stage === 'lock') tx.$queryRaw.mockRejectedValueOnce(error);
      if (stage === 'update')
        tx.taskReminder.updateManyAndReturn.mockRejectedValueOnce(error);
      if (stage === 'notification' || stage === 'non-Error')
        notifications.createNotification.mockRejectedValueOnce(error);

      // Act & Assert: verify the public method outcome.
      await expect(service.processDueReminders()).resolves.toBeUndefined();
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        `Task reminder processing failed for id: first with error: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      expect(notifications.createNotification).toHaveBeenLastCalledWith(
        expect.objectContaining({ reminderId: 'second' }),
        tx,
      );
      expect(logger.error.mock.invocationCallOrder[0]).toBeLessThan(
        notifications.createNotification.mock.invocationCallOrder.slice(-1)[0],
      );
    });

    it('awaits each transaction before starting the next selected reminder', async () => {
      // Arrange
      prisma.taskReminder.findMany.mockResolvedValueOnce([
        { id: 'first' },
        { id: 'second' },
      ]);
      // Hold the first notification open to verify sequential processing.
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      notifications.createNotification.mockImplementationOnce(() => {
        markStarted();
        return gate;
      });

      // Act
      const processing = service.processDueReminders();
      await started;

      // Assert
      expect(notifications.createNotification).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // Finish the first transaction and allow the next reminder to run.
      release();
      await processing;

      expect(
        tx.taskReminder.findUnique.mock.calls.map(
          ([query]: [{ where: { id: string } }]) => query.where.id,
        ),
      ).toEqual(['first', 'second']);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('propagates batch selection failure', async () => {
      // Arrange
      const error = new Error('selection failed');
      prisma.taskReminder.findMany.mockRejectedValueOnce(error);

      // Act & Assert: verify the public method outcome.
      await expect(service.processDueReminders()).rejects.toBe(error);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

// Exercises the two public services together; persistence remains mocked.
describe('Task deletion reminder cancellation', () => {
  const now = new Date('2026-10-19T10:00:00Z');
  let tasks: TasksService;
  let tx: {
    task: { updateMany: jest.Mock };
    taskReminder: { updateMany: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let audit: { log: jest.Mock };
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    tx = {
      task: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      taskReminder: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(
          async (callback: (client: unknown) => Promise<unknown>) =>
            callback(tx),
        ),
    };
    audit = { log: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        TaskRemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaginationService, useValue: {} },
        { provide: AuditLoggerService, useValue: audit },
        {
          provide: LoggerService,
          useValue: { error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn() },
        },
      ],
    }).compile();
    tasks = module.get(TasksService);
  });

  afterEach(() => jest.useRealTimers());
  it('soft deletes the owned active task and cancels only pending reminders on the same client', async () => {
    // Act
    await tasks.softDelete('t1', 'u1');

    // Assert
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.task.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', userId: 'u1', deletedAt: null },
      data: { deletedAt: now },
    });
    expect(tx.taskReminder.updateMany).toHaveBeenCalledWith({
      where: { taskId: 't1', status: Status.PENDING },
      data: { status: Status.CANCELED, canceledAt: now },
    });
    expect(tx.task.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.taskReminder.updateMany.mock.invocationCallOrder[0],
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: TaskAuditAction.TASK_DELETE_SUCCESS }),
    );
  });

  it('does not cancel reminders for a missing, foreign-owned, or already deleted task', async () => {
    // Arrange
    tx.task.updateMany.mockResolvedValueOnce({ count: 0 });

    // Act & Assert: verify the public method outcome.
    await expect(tasks.softDelete('t1', 'u1')).rejects.toThrow(
      NotFoundException,
    );
    expect(tx.taskReminder.updateMany).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: TaskAuditAction.TASK_DELETE_FAILURE }),
    );
  });

  it.each(['delete', 'cancel', 'transaction'])(
    'propagates %s failure without reporting deletion success',
    async (stage) => {
      // Arrange
      const error = new Error(stage);
      if (stage === 'delete') tx.task.updateMany.mockRejectedValueOnce(error);
      if (stage === 'cancel')
        tx.taskReminder.updateMany.mockRejectedValueOnce(error);
      if (stage === 'transaction')
        prisma.$transaction.mockRejectedValueOnce(error);

      // Act & Assert: verify the public method outcome.
      await expect(tasks.softDelete('t1', 'u1')).rejects.toBe(error);
      expect(audit.log).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: TaskAuditAction.TASK_DELETE_FAILURE,
        }),
      );
      if (stage !== 'cancel')
        expect(tx.taskReminder.updateMany).not.toHaveBeenCalled();
    },
  );
});
