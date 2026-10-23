import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { EmailOutboxService } from '@modules/email-outbox/email-outbox.service';

import { EmailOutboxStatus } from '@generated/prisma';
import * as helpers from '../helpers';

describe('Claiming email outbox batches (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let emailOutboxService: EmailOutboxService;
  let cleanupRegistry: helpers.CleanupRegistry;
  let recipient: string;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    emailOutboxService = app.get(EmailOutboxService);
  });

  beforeEach(() => {
    cleanupRegistry = new helpers.CleanupRegistry();
    recipient = helpers.createUniqueEmail('email-outbox-claim-batch');

    cleanupRegistry.register(async () => {
      await prisma.emailOutbox.deleteMany({ where: { to: recipient } });
    });
  });

  afterEach(async () => {
    await cleanupRegistry.run();
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  it('claims due pending emails and expired leases while leaving future retries untouched', async () => {
    // Arrange
    const now = new Date(Date.now() - 60000);
    const leaseDuration = 5;

    const pendingEmail = await prisma.emailOutbox.create({
      data: {
        to: recipient,
        subject: 'Test email',
        payload: { body: 'Test body' },
        status: EmailOutboxStatus.PENDING,
        nextAttemptAt: now,
      },
    });
    await prisma.emailOutbox.create({
      data: {
        to: recipient,
        subject: 'Test email',
        payload: { body: 'Test body' },
        status: EmailOutboxStatus.PENDING,
        nextAttemptAt: new Date(now.getTime() + 10 * 60 * 1000), // in 10 minutes
      },
    });
    const expiredEmail = await prisma.emailOutbox.create({
      data: {
        to: recipient,
        subject: 'Test email',
        payload: { body: 'Test body' },
        status: EmailOutboxStatus.PROCESSING,
        nextAttemptAt: now,
        lockedUntil: new Date(now.getTime() - 1000), // expired lease
      },
    });

    // Act: both eligible records are claimed in the same database operation.
    const batch = await emailOutboxService.claimBatch(10, leaseDuration);

    // Assert
    expect(batch).toHaveLength(2);
    expect(batch).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: pendingEmail.id }),
        expect.objectContaining({ id: expiredEmail.id }),
      ]),
    );
    for (const email of batch) {
      expect(email.status).toBe(EmailOutboxStatus.PROCESSING);
      expect(email.lockedUntil).toBeInstanceOf(Date);
      expect(email.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(email.claimToken).toBeTruthy();
    }

    // Act: claimed records now have active leases and cannot be claimed again.
    const secondBatch = await emailOutboxService.claimBatch(10, leaseDuration);

    // Assert
    expect(secondBatch).toHaveLength(0);
  });

  it('returns disjoint batches when two workers claim concurrently', async () => {
    // Arrange
    const now = new Date(Date.now() - 60000);

    for (let i = 0; i < 10; i++) {
      await prisma.emailOutbox.create({
        data: {
          to: recipient,
          subject: 'Test email',
          payload: { body: 'Test body' },
          status: EmailOutboxStatus.PENDING,
          nextAttemptAt: now,
        },
      });
    }
    // Act: start both claims together so PostgreSQL must arbitrate row ownership.
    const [batchA, batchB] = await Promise.all([
      emailOutboxService.claimBatch(5, 5),
      emailOutboxService.claimBatch(5, 5),
    ]);

    // Assert
    const idsA = batchA.map((email) => email.id);
    const idsB = batchB.map((email) => email.id);

    expect(batchA).toHaveLength(5);
    expect(batchB).toHaveLength(5);

    const allIds = [...idsA, ...idsB];

    expect(new Set(allIds).size).toBe(10);
  });

  it('excludes terminal statuses, future retries and active leases', async () => {
    // Arrange
    const past = new Date(Date.now() - 60000);
    const future = new Date(Date.now() + 3600000);
    await prisma.emailOutbox.createMany({
      data: [
        { status: EmailOutboxStatus.SENT, nextAttemptAt: past },
        { status: EmailOutboxStatus.FAILED, nextAttemptAt: past },
        { status: EmailOutboxStatus.CANCELED, nextAttemptAt: past },
        { status: EmailOutboxStatus.PENDING, nextAttemptAt: future },
        {
          status: EmailOutboxStatus.PROCESSING,
          nextAttemptAt: past,
          lockedUntil: future,
          claimToken: 'active',
        },
      ].map((data) => ({
        to: recipient,
        subject: 'Ineligible',
        payload: {},
        ...data,
      })),
    });
    // Act
    const batch = await emailOutboxService.claimBatch(1, 5);

    // Assert
    expect(batch).toEqual([]);
  });

  it('limits batch size without reclaiming emails that already have active leases', async () => {
    // Arrange
    const past = new Date(Date.now() - 60000);
    await prisma.emailOutbox.createMany({
      data: Array.from({ length: 3 }, () => ({
        to: recipient,
        subject: 'Eligible',
        payload: {},
        nextAttemptAt: past,
      })),
    });
    // Act: the second claim can take only the record left by the first.
    const first = await emailOutboxService.claimBatch(2, 5);
    const second = await emailOutboxService.claimBatch(2, 5);

    // Assert
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(1);
    expect(new Set([...first, ...second].map(({ id }) => id)).size).toBe(3);
    expect([...first, ...second].every(({ attempts }) => attempts === 0)).toBe(
      true,
    );
  });
});
