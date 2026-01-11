import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiRoutes } from '@enums/api-routes';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiCookieAuth('Authentication')
@Controller(ApiRoutes.TASKS)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiOkResponse({
    description: 'List of tasks retrieved.',
    type: TaskEntity,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  findAll(): Promise<TaskEntity[]> {
    return this.tasksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiOkResponse({ description: 'Task retrieved.', type: TaskEntity })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  findOne(@Param('id') id: string): Promise<TaskEntity> {
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ description: 'Task created.', type: TaskEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  create(@Body() createTaskDto: CreateTaskDto): Promise<TaskEntity> {
    return this.tasksService.create(createTaskDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiOkResponse({ description: 'Task updated.', type: TaskEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskEntity> {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiOkResponse({ description: 'Task deleted.', type: TaskEntity })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  delete(@Param('id') id: string): Promise<TaskEntity> {
    return this.tasksService.delete(id);
  }
}
