import { ActorType, NotificationType } from '@generated/prisma';
import { JobAuditAction } from '@loggers/enums/audit-actions.enum';
import { TaskEntity } from '@modules/tasks/entities/task.entity';

import { JobName } from '../enums/job-name.enum';
import { SchedulerRunner } from '../scheduler.runner';
import { TaskRemindersJob } from './task-reminders.job';

describe('TaskRemindersJob', () => {
  let runner: { execute: jest.Mock };
  let tasksService: {
    findTasksWithPendingReminders: jest.Mock;
    markTaskReminderSent: jest.Mock;
  };
  let notificationsService: { createNotification: jest.Mock };
  let auditLogger: { log: jest.Mock };
  let job: TaskRemindersJob;

  beforeEach(() => {
    runner = { execute: jest.fn() };
    tasksService = {
      findTasksWithPendingReminders: jest.fn(),
      markTaskReminderSent: jest.fn(),
    };
    notificationsService = { createNotification: jest.fn() };
    auditLogger = { log: jest.fn() };

    job = new TaskRemindersJob(
      runner as unknown as SchedulerRunner,
      tasksService as never,
      notificationsService as never,
      auditLogger as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute reminder workflow through scheduler runner', async () => {
    runner.execute.mockImplementation(async (_jobName, handler) => {
      await handler();
    });

    const dueDate = new Date('2026-02-20T10:00:00.000Z');
    const pendingTask = new TaskEntity({
      id: 'task-1',
      title: 'Task A',
      userId: 'user-1',
      dueDate,
      remindAt: new Date('2026-02-20T09:00:00.000Z'),
    });

    tasksService.findTasksWithPendingReminders.mockResolvedValue([pendingTask]);
    notificationsService.createNotification.mockResolvedValue(undefined);
    tasksService.markTaskReminderSent.mockResolvedValue(pendingTask);

    await job.handle();

    expect(runner.execute).toHaveBeenCalledWith(
      JobName.TaskReminders,
      expect.any(Function),
    );
    expect(tasksService.findTasksWithPendingReminders).toHaveBeenCalledTimes(1);
    expect(notificationsService.createNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      message: `Reminder: Task "Task A" is due on ${dueDate.toLocaleString()}`,
      type: NotificationType.EMAIL,
    });
    expect(auditLogger.log).toHaveBeenCalledWith({
      action: JobAuditAction.TASK_REMINDERS_EXECUTION_SUCCESS,
      actorType: ActorType.SYSTEM,
      targetEntity: TaskEntity.name,
      targetEntityId: 'task-1',
    });
    expect(tasksService.markTaskReminderSent).toHaveBeenCalledWith('task-1');
  });

  it('should build fallback message for tasks without due date', async () => {
    runner.execute.mockImplementation(async (_jobName, handler) => {
      await handler();
    });

    const pendingTask = new TaskEntity({
      id: 'task-2',
      title: 'Task B',
      userId: 'user-2',
      dueDate: null,
      remindAt: new Date('2026-02-20T09:00:00.000Z'),
    });

    tasksService.findTasksWithPendingReminders.mockResolvedValue([pendingTask]);
    notificationsService.createNotification.mockResolvedValue(undefined);
    tasksService.markTaskReminderSent.mockResolvedValue(pendingTask);

    await job.handle();

    expect(notificationsService.createNotification).toHaveBeenCalledWith({
      userId: 'user-2',
      message: 'Reminder: Task "Task B" is with no due date',
      type: NotificationType.EMAIL,
    });
  });
});
