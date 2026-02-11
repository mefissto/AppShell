import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { TaskStatus } from '@generated/prisma';
import { PaginationService } from '@pagination/services/pagination.service';

import { TaskListRequestDto } from './dto/task-list-request.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    task: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
      findFirstOrThrow: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let paginationService: { buildResponse: jest.Mock };

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
      task: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirstOrThrow: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    paginationService = { buildResponse: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaginationService, useValue: paginationService },
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
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
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
        },
      });
      expect(result).toBeInstanceOf(TaskEntity);
    });
  });

  describe('update', () => {
    it('should update and return a task entity', async () => {
      const task = mockTask();
      prisma.task.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.task.findFirstOrThrow.mockResolvedValueOnce(task);

      const result = await service.update(
        'task-1',
        { title: 'Updated' },
        'user-1',
      );

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
        data: { title: 'Updated' },
      });
      expect(prisma.task.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'task-1', userId: 'user-1', deletedAt: null },
      });
      expect(result).toBeInstanceOf(TaskEntity);
    });

    it('should throw when task to update is missing', async () => {
      prisma.task.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.update('missing', { title: 'Updated' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
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
});
