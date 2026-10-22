import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@generated/prisma';

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
