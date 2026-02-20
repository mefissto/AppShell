import { LoggerService } from '@loggers/app/logger.service';

import { SchedulerRunner } from './scheduler.runner';

describe('SchedulerRunner', () => {
  let logger: {
    setContext: jest.Mock;
    log: jest.Mock;
    error: jest.Mock;
  };
  let runner: SchedulerRunner;

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };

    runner = new SchedulerRunner(logger as unknown as LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set logger context on construction', () => {
    expect(logger.setContext).toHaveBeenCalledWith(SchedulerRunner.name);
  });

  it('should log start and success when handler resolves', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);

    await runner.execute('task-reminders', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenNthCalledWith(1, {
      jobName: 'task-reminders',
      event: 'start',
    });
    expect(logger.log).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        jobName: 'task-reminders',
        event: 'success',
        durationMs: expect.any(Number),
      }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log failure and rethrow when handler rejects', async () => {
    const error = new Error('boom');
    const handler = jest.fn().mockRejectedValue(error);

    await expect(runner.execute('task-reminders', handler)).rejects.toThrow(
      'boom',
    );

    expect(logger.log).toHaveBeenCalledWith({
      jobName: 'task-reminders',
      event: 'start',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: 'task-reminders',
        event: 'failed',
        durationMs: expect.any(Number),
        error: 'boom',
        errorStack: expect.any(String),
      }),
    );
  });
});
