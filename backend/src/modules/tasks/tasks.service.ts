import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all tasks.
   * @returns An array of TaskEntity.
   */
  async findAll(userId: string): Promise<TaskEntity[]> {
    return await this.prisma.task
      .findMany({ where: { userId } })
      .then((results) => results.map((task) => new TaskEntity(task)));
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
      where: { id: taskId, userId },
      data: updateTaskDto,
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return await this.prisma.task
      .findFirstOrThrow({ where: { id: taskId, userId } })
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
