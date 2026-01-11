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
  async findAll(): Promise<TaskEntity[]> {
    return await this.prisma.task
      .findMany()
      .then((results) => results.map((task) => new TaskEntity(task)));
  }

  /**
   * Finds a task by its ID.
   * @param id - The ID of the task to find.
   * @returns The found TaskEntity.
   */
  async findOne(id: string): Promise<TaskEntity> {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return new TaskEntity(task);
  }

  /**
   * Creates a new task.
   * @param createTaskDto - The data to create the task with.
   * @returns The created TaskEntity.
   */
  async create(createTaskDto: CreateTaskDto): Promise<TaskEntity> {
    return await this.prisma.task
      .create({ data: createTaskDto })
      .then((task) => new TaskEntity(task));
  }

  /**
   * Updates a task by its ID.
   * @param id - The ID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @returns The updated TaskEntity.
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<TaskEntity> {
    await this.prisma.task.findUniqueOrThrow({ where: { id } }); // throws if missing

    return await this.prisma.task
      .update({ where: { id }, data: updateTaskDto })
      .then((task) => new TaskEntity(task));
  }

  /**
   * Deletes a task by its ID.
   * @param id - The ID of the task to delete.
   * @returns The deleted TaskEntity.
   */
  async delete(id: string): Promise<TaskEntity> {
    await this.prisma.task.findUniqueOrThrow({ where: { id } }); // throws if missing

    return await this.prisma.task
      .delete({ where: { id } })
      .then((task) => new TaskEntity(task));
  }
}
