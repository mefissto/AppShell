import { TaskRemindersService } from '@modules/task-reminders/task-reminders.service';

import { JobName } from '../enums/job-name.enum';
import { SchedulerRunner } from '../scheduler.runner';
import { TaskRemindersJob } from './task-reminders.job';

describe('TaskRemindersJob', () => {
  let runner: jest.Mocked<Pick<SchedulerRunner, 'execute'>>;
  let taskRemindersService: jest.Mocked<
    Pick<TaskRemindersService, 'processDueReminders'>
  >;
  let job: TaskRemindersJob;

  beforeEach(() => {
    runner = {
      execute: jest
        .fn()
        .mockImplementation(
          async (_jobName: string, handler: () => Promise<void>) => {
            await handler();
          },
        ),
    };
    taskRemindersService = {
      processDueReminders: jest.fn().mockResolvedValue(undefined),
    };

    job = new TaskRemindersJob(
      runner as SchedulerRunner,
      taskRemindersService as TaskRemindersService,
    );
  });

  it('should process due reminders through the scheduler runner', async () => {
    await job.handle();

    expect(runner.execute).toHaveBeenCalledTimes(1);
    expect(runner.execute).toHaveBeenCalledWith(
      JobName.TaskReminders,
      expect.any(Function),
    );
    expect(taskRemindersService.processDueReminders).toHaveBeenCalledTimes(1);
    expect(taskRemindersService.processDueReminders).toHaveBeenCalledWith();
  });

  it('should wait for reminder processing to complete', async () => {
    let completeProcessing!: () => void;
    taskRemindersService.processDueReminders.mockReturnValue(
      new Promise<void>((resolve) => {
        completeProcessing = resolve;
      }),
    );
    const onComplete = jest.fn();

    const execution = job.handle().then(onComplete);
    await Promise.resolve();

    expect(onComplete).not.toHaveBeenCalled();

    completeProcessing();
    await execution;

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should propagate reminder processing errors', async () => {
    const error = new Error('Reminder processing failed');
    taskRemindersService.processDueReminders.mockRejectedValue(error);

    await expect(job.handle()).rejects.toBe(error);
  });

  it('should propagate runner errors without processing reminders', async () => {
    const error = new Error('Runner failed');
    runner.execute.mockRejectedValue(error);

    await expect(job.handle()).rejects.toBe(error);

    expect(taskRemindersService.processDueReminders).not.toHaveBeenCalled();
  });
});
