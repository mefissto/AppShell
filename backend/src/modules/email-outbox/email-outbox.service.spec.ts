import { PrismaService } from '@database/prisma.service';
import { EmailOutboxStatus, Prisma } from '@generated/prisma';

import { EmailOutboxService } from './email-outbox.service';

describe('EmailOutboxService claim input validation', () => {
  let query: jest.Mock;
  let service: EmailOutboxService;

  beforeEach(() => {
    query = jest.fn();
    service = new EmailOutboxService({
      $queryRaw: query,
    } as unknown as PrismaService);
  });

  it.each([0, -1, 1.5, NaN, Infinity])(
    'rejects invalid batch size %s before querying',
    (batchSize) => {
      // Arrange
      const leaseDurationMinutes = 5;

      // Act
      const claim = () => service.claimBatch(batchSize, leaseDurationMinutes);

      // Assert
      expect(claim).toThrow('Batch size must be a positive integer');
      expect(query).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid lease duration %s before querying',
    (leaseDurationMinutes) => {
      // Arrange
      const batchSize = 10;

      // Act
      const claim = () => service.claimBatch(batchSize, leaseDurationMinutes);

      // Assert
      expect(claim).toThrow('Lease duration must be a positive number');
      expect(query).not.toHaveBeenCalled();
    },
  );
});

describe('EmailOutboxService.cancelForReminders', () => {
  let service: EmailOutboxService;
  let updateMany: jest.Mock;
  let transaction: Prisma.TransactionClient;

  beforeEach(() => {
    service = new EmailOutboxService({} as PrismaService);
    updateMany = jest.fn().mockResolvedValue({ count: 2 });
    transaction = {
      emailOutbox: { updateMany },
    } as unknown as typeof transaction;
  });

  it('returns zero without querying when there are no reminders', async () => {
    // Act
    const count = await service.cancelForReminders([], transaction);

    // Assert
    expect(count).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('propagates transaction update errors to the caller', async () => {
    // Arrange: the caller must roll back the task deletion when cancellation fails.
    const error = new Error('Cancellation failed');
    updateMany.mockRejectedValueOnce(error);

    // Act
    const cancellation = service.cancelForReminders(
      ['reminder-1'],
      transaction,
    );

    // Assert
    await expect(cancellation).rejects.toBe(error);
  });
});

describe('EmailOutboxService.startDeliveryAttempt', () => {
  let updateManyAndReturn: jest.Mock;
  let service: EmailOutboxService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T10:00:00Z'));
    updateManyAndReturn = jest.fn().mockResolvedValue([{ attempts: 2 }]);
    service = new EmailOutboxService({
      emailOutbox: { updateManyAndReturn },
    } as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'rejects invalid lease duration %s before updating',
    async (duration) => {
      await expect(
        service.startDeliveryAttempt('email-1', 'claim-1', duration),
      ).rejects.toThrow('Invalid lease duration');
      expect(updateManyAndReturn).not.toHaveBeenCalled();
    },
  );

  it('renews the owned processing lease while incrementing attempts', async () => {
    await expect(
      service.startDeliveryAttempt('email-1', 'claim-1', 60000),
    ).resolves.toBe(2);
    expect(updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: 'email-1',
        claimToken: 'claim-1',
        status: EmailOutboxStatus.PROCESSING,
      },
      data: {
        attempts: { increment: 1 },
        lockedUntil: new Date(Date.now() + 60000),
      },
      select: { attempts: true },
    });
  });

  it('returns null when the claim no longer owns a processing email', async () => {
    updateManyAndReturn.mockResolvedValue([]);
    await expect(
      service.startDeliveryAttempt('email-1', 'stale-claim', 60000),
    ).resolves.toBeNull();
  });
});
