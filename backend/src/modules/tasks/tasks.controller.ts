import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiRoutes } from '@enums/api-routes';

import { CurrentUser } from '@decorators/current-user.decorator';
import { UserEntity } from '@modules/users/entities/user.entity';
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
  findAll(@CurrentUser() currentUser: UserEntity): Promise<TaskEntity[]> {
    return this.tasksService.findAll(currentUser.id);
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
  findOne(
    @Param('id') taskId: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskEntity> {
    return this.tasksService.findOneById(taskId, currentUser.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiCreatedResponse({ description: 'Task created.', type: TaskEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskEntity> {
    return this.tasksService.create(createTaskDto, currentUser.id);
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
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskEntity> {
    return this.tasksService.update(id, updateTaskDto, currentUser.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiNoContentResponse({ description: 'Task deleted.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<void> {
    return this.tasksService.delete(id, currentUser.id);
  }
}
