import { EmailOutboxWorker } from '@modules/email-outbox/email-outbox.worker';

import { JobName } from '../enums/job-name.enum';
import { SchedulerRunner } from '../scheduler.runner';
import { EmailOutboxJob } from './email-outbox.job';

describe('EmailOutboxJob', () => {
  let execute: jest.MockedFunction<SchedulerRunner['execute']>;
  let processBatch: jest.MockedFunction<EmailOutboxWorker['processBatch']>;
  let job: EmailOutboxJob;

  beforeEach(() => {
    execute = jest.fn(async (_name: string, handler: () => Promise<void>) =>
      handler(),
    );
    processBatch = jest.fn().mockResolvedValue(undefined);
    job = new EmailOutboxJob(
      { execute } as unknown as SchedulerRunner,
      { processBatch } as unknown as EmailOutboxWorker,
    );
  });

  it('delegates successive executions to the runner and worker after success', async () => {
    // Arrange: the default worker resolves immediately.

    // Act
    await job.handle();
    await job.handle();

    // Assert
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledWith(
      JobName.EmailOutbox,
      expect.any(Function),
    );
    expect(processBatch).toHaveBeenCalledTimes(2);
  });

  it('skips an overlapping execution while the first batch is in progress', async () => {
    // Arrange: hold the first batch open without sleeps or scheduler timers.
    let complete!: () => void;
    processBatch.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );

    // Act
    const firstExecution = job.handle();
    try {
      await job.handle();

      // Assert: the overlapping call never reaches the runner or worker.
      expect(execute).toHaveBeenCalledTimes(1);
      expect(processBatch).toHaveBeenCalledTimes(1);
    } finally {
      // Release pending work even if an assertion fails.
      complete();
      await firstExecution;
    }
  });

  it.each(['worker', 'runner'])(
    'allows another execution after a %s exception',
    async (source) => {
      // Arrange: only the first execution fails; the next one uses the default behavior.
      const error = new Error('Processing failed');
      if (source === 'worker') processBatch.mockRejectedValueOnce(error);
      else execute.mockRejectedValueOnce(error);

      // Act
      const firstExecution = job.handle();

      // Assert
      await expect(firstExecution).rejects.toBe(error);

      // Act: retry through the public handler to verify the guard was released.
      await job.handle();

      // Assert
      expect(execute).toHaveBeenCalledTimes(2);
      expect(processBatch).toHaveBeenCalledTimes(source === 'worker' ? 2 : 1);
    },
  );
});
