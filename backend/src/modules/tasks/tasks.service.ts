import { Injectable } from '@nestjs/common';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  async create(createTaskDto: CreateTaskDto): Promise<string> {
    return 'This action adds a new task';
  }

  async findAll(): Promise<string> {
    return `This action returns all tasks`;
  }

  async findOne(id: string): Promise<string> {
    return `This action returns a #${id} task`;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<string> {
    return `This action updates a #${id} task`;
  }

  async delete(id: string): Promise<string> {
    return `This action removes a #${id} task`;
  }
}
