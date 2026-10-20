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
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { UserEntity } from '@modules/users/entities/user.entity';

import { ScheduleTaskReminderDto } from './dto/schedule-task-reminder.dto';
import { TaskReminderEntity } from './entities/task-reminder.entity';
import { TaskRemindersService } from './task-reminders.service';

@ApiTags('Task reminders')
@ApiCookieAuth('Authentication')
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@ApiParam({ name: 'taskId', description: 'Task ID' })
@Controller(`${ApiRoutes.TASKS}/:taskId/reminders`)
export class TaskRemindersController {
  constructor(private readonly taskRemindersService: TaskRemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a task reminder' })
  @ApiCreatedResponse({
    description: 'Reminder scheduled.',
    type: TaskReminderEntity,
  })
  @ApiBadRequestResponse({
    description: 'A valid future reminder time is required.',
  })
  @ApiNotFoundResponse({ description: 'Active owned task not found.' })
  schedule(
    @Param('taskId') taskId: string,
    @Body() dto: ScheduleTaskReminderDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskReminderEntity> {
    return this.taskRemindersService.schedule(
      taskId,
      currentUser.id,
      new Date(dto.remindAt),
    );
  }

  @Patch(':reminderId')
  @ApiOperation({ summary: 'Reschedule a pending task reminder' })
  @ApiParam({ name: 'reminderId', description: 'Reminder ID' })
  @ApiOkResponse({
    description: 'Replacement reminder scheduled.',
    type: TaskReminderEntity,
  })
  @ApiBadRequestResponse({
    description: 'A valid future reminder time is required.',
  })
  @ApiNotFoundResponse({
    description: 'Reminder for the active owned task not found.',
  })
  @ApiConflictResponse({ description: 'Reminder is no longer pending.' })
  reschedule(
    @Param('taskId') taskId: string,
    @Param('reminderId') reminderId: string,
    @Body() dto: ScheduleTaskReminderDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskReminderEntity> {
    return this.taskRemindersService.reschedule(
      reminderId,
      taskId,
      currentUser.id,
      new Date(dto.remindAt),
    );
  }

  @Delete(':reminderId')
  @ApiOperation({ summary: 'Cancel a task reminder' })
  @ApiParam({ name: 'reminderId', description: 'Reminder ID' })
  @ApiOkResponse({
    description: 'Reminder canceled (including an already canceled reminder).',
    type: TaskReminderEntity,
  })
  @ApiNotFoundResponse({
    description: 'Reminder for the active owned task not found.',
  })
  @ApiConflictResponse({ description: 'Reminder is already completed.' })
  cancel(
    @Param('reminderId') reminderId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskReminderEntity> {
    return this.taskRemindersService.cancel(reminderId, taskId, currentUser.id);
  }

  @Get()
  @ApiOperation({ summary: 'List task reminders' })
  @ApiOkResponse({
    description: 'List of task reminders for the active owned task.',
    type: [TaskReminderEntity],
  })
  @ApiNotFoundResponse({
    description: 'Active owned task not found.',
  })
  @ApiBadRequestResponse({
    description: 'A valid task ID is required.',
  })
  findAll(
    @Param('taskId') taskId: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<TaskReminderEntity[]> {
    return this.taskRemindersService.findAllForTask(taskId, currentUser.id);
  }
}
