import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { TaskReminderStatus, TaskStatus } from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';
import { PaginationService } from '@pagination/services/pagination.service';

import { TaskListRequestDto } from './dto/task-list-request.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    $transaction: jest.Mock;
    task: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirstOrThrow: jest.Mock;
      deleteMany: jest.Mock;
    };
    tag: {
      findMany: jest.Mock;
    };
    project: {
      findFirst: jest.Mock;
    };
  };
  let paginationService: { buildResponse: jest.Mock };
  let auditLoggerService: { log: jest.Mock };
  let loggerService: { warn: jest.Mock };

  const mockTask = () => ({
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.PENDING,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      task: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirstOrThrow: jest.fn(),
        deleteMany: jest.fn(),
      },
      tag: {
        findMany: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
      },
    };
    paginationService = { buildResponse: jest.fn() };
    auditLoggerService = { log: jest.fn() };
    loggerService = { warn: jest.fn() };

    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma as never),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaginationService, useValue: paginationService },
        { provide: AuditLoggerService, useValue: auditLoggerService },
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated tasks', async () => {
      const request = new TaskListRequestDto();
      request.filter = {
        search: 'test',
        title: 'task',
        status: TaskStatus.PENDING,
      };
      const task = mockTask();
      prisma.task.findMany.mockResolvedValueOnce([task]);
      prisma.task.count.mockResolvedValueOnce(1);

      const expectedResponse = {
        data: [new TaskEntity(task)],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      paginationService.buildResponse.mockReturnValueOnce(expectedResponse);

      const result = await service.findAll(request, 'user-1');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            deletedAt: null,
            title: { contains: 'task', mode: 'insensitive' },
            status: TaskStatus.PENDING,
            OR: expect.arrayContaining([
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
      expect(prisma.task.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ userId: 'user-1', deletedAt: null }),
      });
      expect(paginationService.buildResponse).toHaveBeenCalledWith(
        [expect.any(TaskEntity)],
        1,
        request,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findOneById', () => {
    it('should return a task when found', async () => {
      const task = mockTask();
      prisma.task.findFirst.mockResolvedValueOnce(task);

      const result = await service.findOneById('task-1', 'user-1');

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1' },
        include: { tags: true },
      });
      expect(result).toBeInstanceOf(TaskEntity);
      expect(result).toEqual(expect.objectContaining({ id: 'task-1' }));
    });

    it('should throw when task is not found', async () => {
      prisma.task.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOneById('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a task entity', async () => {
      const task = mockTask();
      prisma.tag.findMany.mockResolvedValueOnce([]);
      prisma.task.create.mockResolvedValueOnce(task);

      const result = await service.create(
        {
          title: 'Test Task',
          description: 'Test description',
          status: TaskStatus.PENDING,
        },
        'user-1',
      );

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: 'Test description',
          status: TaskStatus.PENDING,
          userId: 'user-1',
          tags: {
            create: [],
          },
        },
      });
      expect(result).toBeInstanceOf(TaskEntity);
    });

    it('should connect valid user-owned tags when creating a task', async () => {
      const task = mockTask();
      const tagIds = ['c1234567890abcdef12345678', 'c1234567890abcdef12345679'];

      prisma.tag.findMany.mockResolvedValueOnce(tagIds.map((id) => ({ id })));
      prisma.task.create.mockResolvedValueOnce(task);

      await service.create(
        {
          title: 'Task with tags',
          status: TaskStatus.PENDING,
          tagIds,
        },
        'user-1',
      );

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { id: { in: tagIds }, userId: 'user-1' },
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Task with tags',
          status: TaskStatus.PENDING,
          userId: 'user-1',
          tags: {
            create: tagIds.map((tagId) => ({
              tag: { connect: { id_userId: { id: tagId, userId: 'user-1' } } },
            })),
          },
        },
      });
    });

    it('should throw when any tag does not exist for current user on create', async () => {
      prisma.tag.findMany.mockResolvedValueOnce([
        { id: 'c1234567890abcdef12345678' },
      ]);

      await expect(
        service.create(
          {
            title: 'Task with invalid tags',
            status: TaskStatus.PENDING,
            tagIds: ['c1234567890abcdef12345678', 'c1234567890abcdef12345679'],
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.task.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return a task entity', async () => {
      const task = mockTask();
      prisma.task.findUnique.mockResolvedValueOnce(task);
      prisma.task.update.mockResolvedValueOnce(task);

      const result = await service.update(
        'task-1',
        { title: 'Updated' },
        'user-1',
      );

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
        data: { title: 'Updated', tags: undefined },
        include: { tags: true },
      });
      expect(result).toBeInstanceOf(TaskEntity);
    });

    it('should replace tags using unique tag IDs on update', async () => {
      const task = mockTask();
      const tagIds = [
        'c1234567890abcdef12345678',
        'c1234567890abcdef12345678',
        'c1234567890abcdef12345679',
      ];
      const uniqueTagIds = [
        'c1234567890abcdef12345678',
        'c1234567890abcdef12345679',
      ];

      prisma.tag.findMany.mockResolvedValueOnce(
        uniqueTagIds.map((id) => ({ id })),
      );
      prisma.task.findUnique.mockResolvedValueOnce(task);
      prisma.task.update.mockResolvedValueOnce(task);

      await service.update('task-1', { tagIds }, 'user-1');

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { id: { in: uniqueTagIds }, userId: 'user-1' },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
        data: {
          tags: {
            deleteMany: {},
            create: uniqueTagIds.map((tagId) => ({
              tag: { connect: { id_userId: { id: tagId, userId: 'user-1' } } },
            })),
          },
        },
        include: { tags: true },
      });
    });

    it('should throw when task to update is missing', async () => {
      prisma.task.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('missing', { title: 'Updated' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when any tag does not exist for current user on update', async () => {
      prisma.tag.findMany.mockResolvedValueOnce([
        { id: 'c1234567890abcdef12345678' },
      ]);

      await expect(
        service.update(
          'task-1',
          {
            tagIds: ['c1234567890abcdef12345678', 'c1234567890abcdef12345679'],
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      prisma.task.deleteMany.mockResolvedValueOnce({ count: 1 });

      await service.delete('task-1', 'user-1');

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1' },
      });
    });

    it('should throw when task to delete is missing', async () => {
      prisma.task.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.delete('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignToProject', () => {
    it('should assign task to a project and return updated entity', async () => {
      const task = mockTask();
      const updatedTask = { ...task, projectId: 'c1234567890abcdef12345678' };

      prisma.task.findFirst.mockResolvedValueOnce(task);
      prisma.project.findFirst.mockResolvedValueOnce({
        id: 'c1234567890abcdef12345678',
        ownerId: 'user-1',
      });
      prisma.task.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.task.findFirstOrThrow.mockResolvedValueOnce(updatedTask);

      const result = await service.assignToProject(
        'task-1',
        { projectId: 'c1234567890abcdef12345678' },
        'user-1',
      );

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1' },
      });
      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1234567890abcdef12345678', ownerId: 'user-1' },
      });
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
        data: { projectId: 'c1234567890abcdef12345678' },
      });
      expect(prisma.task.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
      });
      expect(result).toBeInstanceOf(TaskEntity);
    });

    it('should unassign task from project when projectId is null', async () => {
      const task = mockTask();
      const updatedTask = { ...task, projectId: null };

      prisma.task.findFirst.mockResolvedValueOnce(task);
      prisma.task.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.task.findFirstOrThrow.mockResolvedValueOnce(updatedTask);

      const result = await service.assignToProject(
        'task-1',
        { projectId: null },
        'user-1',
      );

      expect(prisma.project.findFirst).not.toHaveBeenCalled();
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
        data: { projectId: null },
      });
      expect(result).toBeInstanceOf(TaskEntity);
    });

    it('should throw when task is not found before assignment', async () => {
      prisma.task.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.assignToProject(
          'missing',
          { projectId: 'c1234567890abcdef12345678' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.project.findFirst).not.toHaveBeenCalled();
      expect(prisma.task.updateMany).not.toHaveBeenCalled();
    });

    it('should throw when project is not found or not owned by user', async () => {
      prisma.task.findFirst.mockResolvedValueOnce(mockTask());
      prisma.project.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.assignToProject(
          'task-1',
          { projectId: 'c1234567890abcdef12345678' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1234567890abcdef12345678', ownerId: 'user-1' },
      });
      expect(prisma.task.updateMany).not.toHaveBeenCalled();
    });

    it('should throw when task updateMany affects no rows', async () => {
      prisma.task.findFirst.mockResolvedValueOnce(mockTask());
      prisma.project.findFirst.mockResolvedValueOnce({
        id: 'c1234567890abcdef12345678',
        ownerId: 'user-1',
      });
      prisma.task.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.assignToProject(
          'task-1',
          { projectId: 'c1234567890abcdef12345678' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.task.findFirstOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('findTasksWithPendingReminders', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-20T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should query pending reminders in today range and map to TaskEntity', async () => {
      const task = {
        ...mockTask(),
        remindAt: new Date('2026-02-20T08:00:00.000Z'),
        dueDate: new Date('2026-02-20T20:00:00.000Z'),
        reminderStatus: TaskReminderStatus.PENDING,
      };
      prisma.task.findMany.mockResolvedValueOnce([task]);

      const result = await service.findTasksWithPendingReminders();

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          reminderStatus: TaskReminderStatus.PENDING,
          remindAt: {
            not: null,
            gte: new Date(2026, 1, 20),
            lte: new Date(2026, 1, 21),
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TaskEntity);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'task-1' }));
    });
  });

  describe('markTaskReminderSent', () => {
    it('should update reminder status to SENT and clear remindAt', async () => {
      const updatedTask = {
        ...mockTask(),
        remindAt: null,
        reminderStatus: TaskReminderStatus.SENT,
      };
      prisma.task.update.mockResolvedValueOnce(updatedTask);

      const result = await service.markTaskReminderSent('task-1');

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { reminderStatus: TaskReminderStatus.SENT, remindAt: null },
      });
      expect(result).toBeInstanceOf(TaskEntity);
      expect(result).toEqual(expect.objectContaining({ id: 'task-1' }));
    });
  });
});
