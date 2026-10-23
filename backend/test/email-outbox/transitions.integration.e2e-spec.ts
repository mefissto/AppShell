import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { EmailDeliveryError } from '@common/errors/email-delivery.error';
import { PrismaService } from '@database/prisma.service';
import { EntityType } from '@enums/entity.enum';
import { EmailTemplate } from '@enums/email-template.enum';
import { EmailOutbox, EmailOutboxStatus } from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import {
  EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
  EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS,
} from '@modules/email-outbox/constants/email-outbox.const';
import { EmailOutboxService } from '@modules/email-outbox/email-outbox.service';
import { EmailOutboxWorker } from '@modules/email-outbox/email-outbox.worker';
import { EmailSenderService } from '@modules/email/email-sender.service';
import { EmailTemplateService } from '@modules/email/email-template.service';

import * as helpers from '../helpers';

describe('Email outbox transitions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let service: EmailOutboxService;
  let recipient: string;
  let send: jest.MockedFunction<EmailSenderService['send']>;

  const createInput = () => ({
    to: recipient,
    subject: 'Reminder',
    payload: {
      template: EmailTemplate.TASK_REMINDER,
      data: { taskTitle: 'Task', taskDueDate: null },
    },
  });
  const createEmail = () =>
    prisma.$transaction((tx) => service.create(createInput(), tx));
  const readEmail = (id: string) =>
    prisma.emailOutbox.findUniqueOrThrow({ where: { id } });

  // Claiming is global, as in the existing claim suite; execute E2E suites serially.
  const claimEmail = async (
    id: string,
  ): Promise<EmailOutbox & { claimToken: string }> => {
    const batch = await service.claimBatch(10, 5);
    const record = batch.find((entry) => entry.id === id);
    if (!record?.claimToken)
      throw new Error(`Expected email ${id} to have a claim token`);
    return { ...record, claimToken: record.claimToken };
  };

  const createWorker = (record: EmailOutbox) => {
    // Stub only selection; delivery attempts and state transitions still use PostgreSQL.
    jest.spyOn(service, 'claimBatch').mockResolvedValueOnce([record]);
    return new EmailOutboxWorker(
      service,
      new EmailTemplateService(),
      { send } as unknown as EmailSenderService,
      {
        setContext: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as unknown as LoggerService,
    );
  };

  beforeAll(async () => {
    send = jest.fn();
    ({ app } = await helpers.createTestApp({
      overrides: [{ provide: EmailSenderService, useValue: { send } }],
    }));
    prisma = app.get(PrismaService);
    service = app.get(EmailOutboxService);
  });

  beforeEach(() => {
    recipient = helpers.createUniqueEmail('outbox-transitions');
    send.mockReset().mockResolvedValue({ id: 'mock-delivery' });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.emailOutbox.deleteMany({ where: { to: recipient } });
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  it('commits outbox creation with its transaction', async () => {
    // Arrange
    const input = createInput();

    // Act
    const created = await prisma.$transaction((tx) =>
      service.create(input, tx),
    );

    // Assert: read outside the transaction to verify the insert was committed.
    expect(await readEmail(created.id)).toMatchObject({
      ...input,
      status: EmailOutboxStatus.PENDING,
      attempts: 0,
      claimToken: null,
    });
  });

  it('rolls back outbox creation when its transaction fails', async () => {
    // Arrange
    const failure = new Error('Rollback');

    // Act
    const transaction = prisma.$transaction(async (tx) => {
      await service.create(createInput(), tx);
      throw failure;
    });

    // Assert: rejection alone is insufficient; the inserted row must also be absent.
    await expect(transaction).rejects.toThrow('Rollback');
    expect(await prisma.emailOutbox.count({ where: { to: recipient } })).toBe(
      0,
    );
  });

  it('reclaims an expired lease with a new token without incrementing attempts', async () => {
    // Arrange: simulate a worker that started delivery and then stopped renewing its lease.
    const created = await createEmail();
    const original = await claimEmail(created.id);
    await service.startDeliveryAttempt(
      original.id,
      original.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );
    await prisma.emailOutbox.update({
      where: { id: original.id },
      data: { lockedUntil: new Date(Date.now() - 60000) },
    });

    // Act
    const reclaimed = await claimEmail(original.id);

    // Assert
    expect(original.attempts).toBe(0);
    expect(reclaimed.claimToken).not.toBe(original.claimToken);
    expect(reclaimed.attempts).toBe(1);
    expect(reclaimed.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects stale delivery, success and failure updates after a lease is reclaimed', async () => {
    // Arrange: the second worker now owns the record.
    const created = await createEmail();
    const original = await claimEmail(created.id);
    await prisma.emailOutbox.update({
      where: { id: original.id },
      data: { lockedUntil: new Date(Date.now() - 60000) },
    });
    const current = await claimEmail(original.id);

    // Act: the original worker tries each conditional mutation with its obsolete token.
    const attempts = await service.startDeliveryAttempt(
      original.id,
      original.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );
    const markedAsSent = await service.markAsSent(
      original.id,
      original.claimToken,
    );
    const markedAsFailed = await service.handleDeliveryFailure(
      original.id,
      original.claimToken,
      'Stale',
      null,
    );

    // Assert
    expect(attempts).toBeNull();
    expect(markedAsSent).toBe(false);
    expect(markedAsFailed).toBe(false);
    expect(await readEmail(original.id)).toEqual(current);
  });

  it('clears ownership on success and rejects late failure updates', async () => {
    // Arrange
    const created = await createEmail();
    const owned = await claimEmail(created.id);
    await service.startDeliveryAttempt(
      owned.id,
      owned.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );

    // Act
    const markedAsSent = await service.markAsSent(owned.id, owned.claimToken);
    const sent = await readEmail(owned.id);
    const markedAsFailed = await service.handleDeliveryFailure(
      owned.id,
      owned.claimToken,
      'Late failure',
      null,
    );

    // Assert: a delayed result cannot undo a completed delivery.
    expect(markedAsSent).toBe(true);
    expect(sent).toMatchObject({
      status: EmailOutboxStatus.SENT,
      attempts: 1,
      lockedUntil: null,
      claimToken: null,
      lastError: null,
    });
    expect(sent.sentAt).toBeInstanceOf(Date);
    expect(markedAsFailed).toBe(false);
    expect(await readEmail(owned.id)).toEqual(sent);
  });

  it.each([
    { outcome: 'retryable', retry: true, status: EmailOutboxStatus.PENDING },
    { outcome: 'permanent', retry: false, status: EmailOutboxStatus.FAILED },
  ])('clears ownership after a $outcome failure', async ({ retry, status }) => {
    // Arrange
    const created = await createEmail();
    const owned = await claimEmail(created.id);
    await service.startDeliveryAttempt(
      owned.id,
      owned.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );
    const nextAttemptAt = new Date(Date.now() + 600000);

    // Act
    const updated = await service.handleDeliveryFailure(
      owned.id,
      owned.claimToken,
      'Failure',
      retry ? nextAttemptAt : null,
    );
    const result = await readEmail(owned.id);
    const staleAttempt = await service.startDeliveryAttempt(
      owned.id,
      owned.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );

    // Assert
    expect(updated).toBe(true);
    expect(result).toMatchObject({
      status,
      attempts: 1,
      claimToken: null,
      lockedUntil: null,
      lastError: 'Failure',
    });
    if (retry) expect(result.nextAttemptAt).toEqual(nextAttemptAt);
    expect(staleAttempt).toBeNull();
  });

  it('delivers once and persists sent status, attempts, timestamp and cleared ownership', async () => {
    // Arrange
    const created = await createEmail();
    const worker = createWorker(await claimEmail(created.id));

    // Act
    await worker.processBatch();

    // Assert
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      {
        to: recipient,
        subject: 'Reminder',
        html: '<p>Task: Task</p>',
        text: 'Task: Task',
      },
      `EMAIL_OUTBOX/${created.id}`,
    );
    const result = await readEmail(created.id);
    expect(result).toMatchObject({
      status: EmailOutboxStatus.SENT,
      attempts: 1,
      claimToken: null,
      lockedUntil: null,
    });
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  it.each([
    {
      scenario: 'invalid payload',
      invalidPayload: true,
      attempts: 0,
      providerRetryable: null,
      expectedAttempts: 0,
      expectedSends: 0,
      expectedStatus: EmailOutboxStatus.FAILED,
    },
    {
      scenario: 'permanent provider failure',
      invalidPayload: false,
      attempts: 0,
      providerRetryable: false,
      expectedAttempts: 1,
      expectedSends: 1,
      expectedStatus: EmailOutboxStatus.FAILED,
    },
    {
      scenario: 'retryable provider failure',
      invalidPayload: false,
      attempts: 0,
      providerRetryable: true,
      expectedAttempts: 1,
      expectedSends: 1,
      expectedStatus: EmailOutboxStatus.PENDING,
    },
    {
      scenario: 'exhausted attempts',
      invalidPayload: false,
      attempts: EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS,
      providerRetryable: null,
      expectedAttempts: EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS,
      expectedSends: 0,
      expectedStatus: EmailOutboxStatus.FAILED,
    },
  ])(
    'persists the worker outcome for $scenario',
    async ({
      invalidPayload,
      attempts,
      providerRetryable,
      expectedAttempts,
      expectedSends,
      expectedStatus,
    }) => {
      // Arrange: explicit expected values keep this table independent of the worker's branching logic.
      const created = await createEmail();
      await prisma.emailOutbox.update({
        where: { id: created.id },
        data: { attempts, ...(invalidPayload ? { payload: {} } : {}) },
      });
      if (providerRetryable !== null)
        send.mockRejectedValueOnce(
          new EmailDeliveryError(
            'Provider failure',
            undefined,
            providerRetryable,
          ),
        );
      const worker = createWorker(await claimEmail(created.id));
      const beforeProcessing = Date.now();

      // Act
      await worker.processBatch();

      // Assert
      const result = await readEmail(created.id);
      expect(result).toMatchObject({
        status: expectedStatus,
        attempts: expectedAttempts,
        claimToken: null,
        lockedUntil: null,
        sentAt: null,
      });
      expect(send).toHaveBeenCalledTimes(expectedSends);
      if (providerRetryable === true)
        expect(result.nextAttemptAt.getTime()).toBeGreaterThan(
          beforeProcessing,
        );
    },
  );

  it('cancels only pending and processing emails for the requested task reminders', async () => {
    // Arrange: include terminal states and unrelated records to verify cancellation boundaries.
    const statuses = Object.values(EmailOutboxStatus);
    const related = await Promise.all(
      statuses.map((status) =>
        prisma.emailOutbox.create({
          data: {
            ...createInput(),
            entityId: 'reminder-1',
            entityType: EntityType.TASK_REMINDER,
            status,
            attempts: 2,
            claimToken:
              status === EmailOutboxStatus.PROCESSING ? 'owned-claim' : null,
            lockedUntil:
              status === EmailOutboxStatus.PROCESSING
                ? new Date(Date.now() + 300000)
                : null,
          },
        }),
      ),
    );
    const unrelated = await Promise.all(
      [
        { entityId: 'reminder-2', entityType: EntityType.TASK_REMINDER },
        { entityId: 'reminder-1', entityType: 'OTHER_ENTITY' },
        { entityId: null, entityType: null },
      ].map((link) =>
        prisma.emailOutbox.create({ data: { ...createInput(), ...link } }),
      ),
    );
    const beforeCancellation = Date.now();

    // Act
    const count = await prisma.$transaction((tx) =>
      service.cancelForReminders(['reminder-1'], tx),
    );

    // Assert: canceling a processing record revokes ownership without changing delivery history.
    expect(count).toBe(2);
    for (const original of related) {
      const result = await readEmail(original.id);
      if (
        original.status === EmailOutboxStatus.PENDING ||
        original.status === EmailOutboxStatus.PROCESSING
      ) {
        expect(result).toMatchObject({
          status: EmailOutboxStatus.CANCELED,
          attempts: 2,
          claimToken: null,
          lockedUntil: null,
        });
        expect(result.canceledAt).toBeInstanceOf(Date);
        expect(result.canceledAt!.getTime()).toBeGreaterThanOrEqual(
          beforeCancellation,
        );
      } else {
        expect(result).toEqual(original);
      }
    }
    for (const original of unrelated)
      expect(await readEmail(original.id)).toEqual(original);
  });

  it('rejects late worker updates after cancellation and leaves the original cancellation timestamp unchanged', async () => {
    // Arrange: simulate a worker that already holds a processing claim.
    const created = await prisma.emailOutbox.create({
      data: {
        ...createInput(),
        entityId: 'reminder-1',
        entityType: EntityType.TASK_REMINDER,
      },
    });
    const owned = await claimEmail(created.id);
    await prisma.$transaction((tx) =>
      service.cancelForReminders(['reminder-1'], tx),
    );
    const canceled = await readEmail(created.id);

    // Act: neither a late provider result nor another cancellation may overwrite this state.
    const attempt = await service.startDeliveryAttempt(
      owned.id,
      owned.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );
    const sent = await service.markAsSent(owned.id, owned.claimToken);
    const failed = await service.handleDeliveryFailure(
      owned.id,
      owned.claimToken,
      'Late result',
      new Date(Date.now() + 60000),
    );
    const canceledAgain = await prisma.$transaction((tx) =>
      service.cancelForReminders(['reminder-1'], tx),
    );

    // Assert
    expect(attempt).toBeNull();
    expect(sent).toBe(false);
    expect(failed).toBe(false);
    expect(canceledAgain).toBe(0);
    expect(await readEmail(created.id)).toEqual(canceled);
  });

  it('rolls back email cancellation when its enclosing transaction fails', async () => {
    // Arrange
    const original = await prisma.emailOutbox.create({
      data: {
        ...createInput(),
        entityId: 'reminder-1',
        entityType: EntityType.TASK_REMINDER,
      },
    });

    // Act: fail after the cancellation has written to PostgreSQL.
    const transaction = prisma.$transaction(async (tx) => {
      await service.cancelForReminders(['reminder-1'], tx);
      throw new Error('Rollback cancellation');
    });

    // Assert
    await expect(transaction).rejects.toThrow('Rollback cancellation');
    expect(await readEmail(original.id)).toEqual(original);
  });
});
