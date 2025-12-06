import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

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
    try {
      const tasks = await this.prisma.task.findMany();
      return tasks.map((task) => new TaskEntity(task));
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve tasks');
    }
  }

  /**
   * Finds a task by its ID.
   * @param id - The ID of the task to find.
   * @returns The found TaskEntity.
   */
  async findOne(id: string): Promise<TaskEntity> {
    try {
      const task = await this.prisma.task.findUnique({ where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return new TaskEntity(task);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve task with ID ${id}`,
      );
    }
  }

  /**
   * Creates a new task.
   * @param createTaskDto - The data to create the task with.
   * @returns The created TaskEntity.
   */
  async create(createTaskDto: CreateTaskDto): Promise<TaskEntity> {
    try {
      const task = await this.prisma.task.create({
        data: createTaskDto,
      });

      return new TaskEntity(task);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  /**
   * Updates a task by its ID.
   * @param id - The ID of the task to update.
   * @param updateTaskDto - The data to update the task with.
   * @returns The updated TaskEntity.
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<TaskEntity> {
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: updateTaskDto,
      });
      return new TaskEntity(task);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to update task with ID ${id}`,
      );
    }
  }

  /**
   * Deletes a task by its ID.
   * @param id - The ID of the task to delete.
   * @returns The deleted TaskEntity.
   */
  async delete(id: string): Promise<TaskEntity> {
    try {
      const task = await this.prisma.task.delete({ where: { id } });
      return new TaskEntity(task);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete task with ID ${id}`,
      );
    }
  }
}
