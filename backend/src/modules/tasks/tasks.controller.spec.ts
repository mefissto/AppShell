import { Test, TestingModule } from '@nestjs/testing';

import { TaskStatus } from '@generated/prisma';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: {
    findAll: jest.Mock;
    findOneById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    assignToProject: jest.Mock;
    delete: jest.Mock;
  };

  const mockTask = () => ({
    id: 't1',
    title: 'Test Task',
    description: 'This is a test task',
    status: TaskStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const mockCurrentUser = () => ({
    id: 'u1',
    email: 'test@gmail.com',
    name: 'Test User',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    tasksService = {
      findAll: jest.fn(),
      findOneById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignToProject: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: tasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const task = mockTask();
      const user = mockCurrentUser();
      const response = {
        data: [task],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      tasksService.findAll.mockResolvedValueOnce(response);

      const result = await controller.findAll({}, user);

      expect(tasksService.findAll).toHaveBeenCalledWith({}, user.id);
      expect(result).toEqual(response);
    });

    it('should return an empty array when no tasks exist', async () => {
      const user = mockCurrentUser();
      const response = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      tasksService.findAll.mockResolvedValueOnce(response);

      const result = await controller.findAll({}, user);

      expect(tasksService.findAll).toHaveBeenCalledWith({}, user.id);
      expect(result).toEqual(response);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      const task = mockTask();
      const user = mockCurrentUser();
      tasksService.findOneById.mockResolvedValueOnce(task);

      const result = await controller.findOne(task.id, user);

      expect(tasksService.findOneById).toHaveBeenCalledWith(task.id, user.id);
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException if task not found', async () => {
      const user = mockCurrentUser();
      tasksService.findOneById.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.findOne('t1', user)).rejects.toThrow(
        NotFoundException,
      );
      expect(tasksService.findOneById).toHaveBeenCalledWith('t1', user.id);
    });
  });

  describe('create', () => {
    it('should create and return a new task', async () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'This is a test task',
        status: TaskStatus.PENDING,
      };
      const task = mockTask();
      const currentUser = mockCurrentUser();
      tasksService.create.mockResolvedValueOnce(task);

      const result = await controller.create(createTaskDto, currentUser);

      expect(tasksService.create).toHaveBeenCalledWith(
        createTaskDto,
        currentUser.id,
      );
      expect(result).toEqual(task);
    });

    it('should throw error if creation fails', async () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'This is a test task',
        status: TaskStatus.PENDING,
      };
      const currentUser = mockCurrentUser();
      tasksService.create.mockRejectedValueOnce(
        new ConflictException('Creation failed'),
      );

      await expect(
        controller.create(createTaskDto, currentUser),
      ).rejects.toThrow(ConflictException);
      expect(tasksService.create).toHaveBeenCalledWith(
        createTaskDto,
        currentUser.id,
      );
    });
  });

  describe('update', () => {
    it('should update and return the task', async () => {
      const task = mockTask();
      const user = mockCurrentUser();
      const updateTaskDto = { title: 'Updated Title' };
      const updatedTask = { ...task, ...updateTaskDto };
      tasksService.update.mockResolvedValueOnce(updatedTask);

      const result = await controller.update(task.id, updateTaskDto, user);

      expect(tasksService.update).toHaveBeenCalledWith(
        task.id,
        updateTaskDto,
        user.id,
      );
      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException if task to update not found', async () => {
      const updateTaskDto = { title: 'Updated Name' };
      const user = mockCurrentUser();
      tasksService.update.mockRejectedValueOnce(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.update('t1', updateTaskDto, user),
      ).rejects.toThrow(NotFoundException);
      expect(tasksService.update).toHaveBeenCalledWith(
        't1',
        updateTaskDto,
        user.id,
      );
    });
  });

  describe('delete', () => {
    it('should delete the task', async () => {
      tasksService.delete.mockResolvedValueOnce(undefined);
      const user = mockCurrentUser();

      await controller.delete('t1', user);

      expect(tasksService.delete).toHaveBeenCalledWith('t1', user.id);
    });

    it('should throw NotFoundException if task to delete not found', async () => {
      tasksService.delete.mockRejectedValueOnce(
        new NotFoundException('Task not found'),
      );
      const user = mockCurrentUser();

      await expect(controller.delete('t1', user)).rejects.toThrow(
        NotFoundException,
      );
      expect(tasksService.delete).toHaveBeenCalledWith('t1', user.id);
    });
  });

  describe('assignToProject', () => {
    it('should assign task to project', async () => {
      const user = mockCurrentUser();
      const task = { ...mockTask(), projectId: 'c1234567890abcdef12345678' };
      const dto = { projectId: 'c1234567890abcdef12345678' };

      tasksService.assignToProject.mockResolvedValueOnce(task);

      const result = await controller.assignToProject('t1', dto, user);

      expect(tasksService.assignToProject).toHaveBeenCalledWith(
        't1',
        dto,
        user.id,
      );
      expect(result).toEqual(task);
    });

    it('should unassign task from project with null projectId', async () => {
      const user = mockCurrentUser();
      const task = { ...mockTask(), projectId: null };
      const dto = { projectId: null };

      tasksService.assignToProject.mockResolvedValueOnce(task);

      const result = await controller.assignToProject('t1', dto, user);

      expect(tasksService.assignToProject).toHaveBeenCalledWith(
        't1',
        dto,
        user.id,
      );
      expect(result).toEqual(task);
    });

    it('should throw NotFoundException when task or project is not found', async () => {
      const user = mockCurrentUser();
      const dto = { projectId: 'c1234567890abcdef12345678' };

      tasksService.assignToProject.mockRejectedValueOnce(
        new NotFoundException('Task or project not found'),
      );

      await expect(controller.assignToProject('t1', dto, user)).rejects.toThrow(
        NotFoundException,
      );
      expect(tasksService.assignToProject).toHaveBeenCalledWith(
        't1',
        dto,
        user.id,
      );
    });
  });
});
