import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { EntityListRequestBuilder } from '@pagination/builders/entity-list-request.builder';
import { EntityListResponseDto } from '@pagination/interfaces/entity-list-response.dto';
import { PaginationService } from '@pagination/services/pagination.service';

import { AssignToProjectDto } from './dto/assign-to-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskListRequestDto } from './dto/task-list-request.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Retrieves all tasks with pagination, filtering, and sorting.
   * @returns A paginated response with tasks.
   */
  async findAll(
    taskListRequestDto: TaskListRequestDto,
    userId: string,
  ): Promise<EntityListResponseDto<TaskEntity>> {
    // Build the query using the builder
    const query = new EntityListRequestBuilder(taskListRequestDto)
      .addFilter((filter) => {
        const where: Record<string, unknown> = {
          userId,
          deletedAt: null, // Exclude soft-deleted tasks
        };

        // Add search across multiple fields
        if (filter.search) {
          where.OR = [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } },
          ];
        }

        // Add title filter if provided (partial match)
        if (filter.title) {
          where.title = { contains: filter.title, mode: 'insensitive' };
        }

        // Add status filter if provided (exact match)
        if (filter.status) {
          where.status = filter.status;
        }

        return where;
      })
      .addSort()
      .addPagination()
      .build();

    // Execute the query and get total count in parallel
    const [tasks, total] = await Promise.all([
      this.prisma.task
        .findMany(query)
        .then((results) => results.map((task) => new TaskEntity(task))),
      this.prisma.task.count({ where: query.where }),
    ]);

    return this.paginationService.buildResponse(
      tasks,
      total,
      taskListRequestDto,
    );
  }

  /**
   * Finds a task by its ID.
   * @param taskId - The ID of the task to find.
   * @returns The found TaskEntity.
   */
  async findOneById(taskId: string, userId: string): Promise<TaskEntity> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return new TaskEntity(task);
  }

  /**
   * Creates a new task.
   * @param createTaskDto - The data to create the task with.
   * @returns The created TaskEntity.
   */
  async create(
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<TaskEntity> {
    return await this.prisma.task
      .create({ data: { ...createTaskDto, userId } })
      .then((task) => new TaskEntity(task));
  }

  /**
   * Updates a task by its ID.
   * @param taskId - The ID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @returns The updated TaskEntity.
   */
  async update(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<TaskEntity> {
    // TODO: Think about a composite unique (id, userId) for tasks --> schema.prisma: @@unique([id, userId])

    // Using updateMany to ensure userId is also matched to prevent updating tasks not owned by the user
    // updateMany returns a count of updated records to verify if a task was updated
    const updated = await this.prisma.task.updateMany({
      where: { id: taskId, userId, deletedAt: null },
      data: updateTaskDto,
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return await this.prisma.task
      .findFirstOrThrow({ where: { id: taskId, userId, deletedAt: null } })
      .then((task) => new TaskEntity(task));
  }

  async assignToProject(
    id: string,
    assignToProjectDto: AssignToProjectDto,
    userId: string,
  ): Promise<TaskEntity> {
    // Using updateMany to ensure userId is also matched to prevent updating tasks not owned by the user
    // updateMany returns a count of updated records to verify if a task was updated

    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // If projectId is provided, verify that the project exists and belongs to the user
    if (assignToProjectDto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: assignToProjectDto.projectId, ownerId: userId },
      });

      if (!project) {
        throw new NotFoundException(
          `Project with ID ${assignToProjectDto.projectId} not found`,
        );
      }
    }

    const updated = await this.prisma.task.updateMany({
      where: { id, userId, deletedAt: null },
      data: { projectId: assignToProjectDto.projectId },
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return await this.prisma.task
      .findFirstOrThrow({ where: { id, userId, deletedAt: null } })
      .then((task) => new TaskEntity(task));
  }

  /**
   * Deletes a task by its ID.
   * @param taskId - The ID of the task to delete.
   * @returns void.
   */
  async delete(taskId: string, userId: string): Promise<void> {
    // Using deleteMany to ensure userId is also matched to prevent deleting tasks not owned by the user
    // deleteMany returns a count of deleted records to verify if a task was deleted
    const deleted = await this.prisma.task.deleteMany({
      where: { id: taskId, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }
  }
}
