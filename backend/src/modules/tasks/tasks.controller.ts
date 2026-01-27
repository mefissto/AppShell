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
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { UserEntity } from '@modules/users/entities/user.entity';
import { EntityListResponseDto } from '@pagination/interfaces/entity-list-response.dto';

import { CreateTaskDto } from './dto/create-task.dto';
import { TaskListRequestDto } from './dto/task-list-request.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiCookieAuth('Authentication')
@Controller(ApiRoutes.TASKS)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all tasks with pagination, filtering, and sorting',
  })
  @ApiQuery({
    name: 'filter.search',
    required: false,
    description: 'Search in title and description',
  })
  @ApiQuery({
    name: 'filter.title',
    required: false,
    description: 'Filter by title (partial match)',
  })
  @ApiQuery({
    name: 'filter.status',
    required: false,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
  })
  @ApiQuery({
    name: 'sort.field',
    required: false,
    enum: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'sort.direction', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'pagination.page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'pagination.limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiOkResponse({
    description: 'Paginated list of tasks retrieved.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(TaskEntity) },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 10 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  findAll(
    @Query(new ValidationPipe({ transform: true }))
    taskListRequestDto: TaskListRequestDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<EntityListResponseDto<TaskEntity>> {
    return this.tasksService.findAll(taskListRequestDto, currentUser.id);
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
  @ApiNotFoundResponse({ description: 'Task not found.' })
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
  @ApiNotFoundResponse({ description: 'Task not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<void> {
    return this.tasksService.delete(id, currentUser.id);
  }
}
