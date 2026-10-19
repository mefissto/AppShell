import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import { UserEntity } from '@modules/users/entities/user.entity';
import { ScheduleTaskReminderDto } from './dto/schedule-task-reminder.dto';
import { TaskReminderEntity } from './entities/task-reminder.entity';
import { TaskRemindersController } from './task-reminders.controller';
import { TaskRemindersService } from './task-reminders.service';

describe('TaskRemindersController', () => {
  let controller: TaskRemindersController;
  let service: {
    schedule: jest.Mock;
    reschedule: jest.Mock;
    cancel: jest.Mock;
    findAllForTask: jest.Mock;
  };
  const user = { id: 'u1' } as UserEntity;
  const dto = { remindAt: '2027-01-01T09:00:00.000Z' };

  beforeEach(async () => {
    service = {
      schedule: jest.fn(),
      reschedule: jest.fn(),
      cancel: jest.fn(),
      findAllForTask: jest.fn(),
    };
    const module = await Test.createTestingModule({
      controllers: [TaskRemindersController],
      providers: [{ provide: TaskRemindersService, useValue: service }],
    }).compile();
    controller = module.get(TaskRemindersController);
  });

  it('schedules for the current user and converts the request date', async () => {
    // Arrange
    const reminder = new TaskReminderEntity({ id: 'r1' });
    service.schedule.mockResolvedValueOnce(reminder);

    // Act
    const result = await controller.schedule('t1', dto, user);

    // Assert
    expect(result).toBe(reminder);
    expect(service.schedule).toHaveBeenCalledWith(
      't1',
      'u1',
      new Date(dto.remindAt),
    );
  });

  it('reschedules for the current user', async () => {
    // Arrange
    const reminder = new TaskReminderEntity({ id: 'replacement' });
    service.reschedule.mockResolvedValueOnce(reminder);

    // Act
    const result = await controller.reschedule('t1', 'r1', dto, user);

    // Assert
    expect(result).toBe(reminder);
    expect(service.reschedule).toHaveBeenCalledWith(
      'r1',
      't1',
      'u1',
      new Date(dto.remindAt),
    );
  });

  it('cancels for the current user', async () => {
    // Arrange
    const reminder = new TaskReminderEntity({ id: 'r1' });
    service.cancel.mockResolvedValueOnce(reminder);

    // Act
    const result = await controller.cancel('r1', 't1', user);

    // Assert
    expect(result).toBe(reminder);
    expect(service.cancel).toHaveBeenCalledWith('r1', 't1', 'u1');
  });

  it.each(['schedule', 'reschedule', 'cancel'] as const)(
    'propagates %s service errors',
    async (method) => {
      // Arrange
      const error = new NotFoundException();
      service[method].mockRejectedValueOnce(error);

      // Act
      const result =
        method === 'schedule'
          ? controller.schedule('t1', dto, user)
          : method === 'reschedule'
            ? controller.reschedule('t1', 'r1', dto, user)
            : controller.cancel('r1', 't1', user);

      // Assert
      await expect(result).rejects.toBe(error);
    },
  );

  it('lists reminders for the task and current user', async () => {
    // Arrange
    const reminders = [new TaskReminderEntity({ id: 'r1' })];
    service.findAllForTask.mockResolvedValueOnce(reminders);

    // Act
    const result = await controller.findAll('t1', user);

    // Assert
    expect(result).toBe(reminders);
    expect(service.findAllForTask).toHaveBeenCalledWith('t1', 'u1');
  });

  it.each([
    undefined,
    null,
    '',
    'tomorrow',
    '2027-02-30T09:00:00Z',
    123,
    '2027-01-01',
    '2027-01-01T09:00:00',
    '2027-01-01T09:00:00.000',
    '2027-01-01T09:00:00+24:00',
    '2027-01-01T09:00:00+02:60',
    '2027-01-01T09:00:00 Europe/Warsaw',
  ])('rejects an invalid remindAt body value: %s', async (remindAt) => {
    // Arrange
    const body = Object.assign(new ScheduleTaskReminderDto(), { remindAt });

    // Act
    const errors = await validate(body);

    // Assert
    expect(errors.some((error) => error.property === 'remindAt')).toBe(true);
  });

  it.each([
    '2027-01-01T09:00:00Z',
    '2027-01-01T09:00:00.000Z',
    '2027-01-01T09:00:00+02:00',
    '2027-01-01T09:00:00.123-05:30',
    '2027-01-01T09:00:00+00:00',
  ])('accepts a timestamp with an explicit timezone: %s', async (remindAt) => {
    // Arrange
    const body = Object.assign(new ScheduleTaskReminderDto(), { remindAt });

    // Act & Assert
    await expect(validate(body)).resolves.toEqual([]);
  });
});
