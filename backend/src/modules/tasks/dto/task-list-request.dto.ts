import { TaskStatus } from '@generated/prisma';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

import { EntityListRequestDto } from '@pagination/interfaces/entity-list-request.dto';
import { EntitySortDto } from '@pagination/interfaces/entity-sort.dto';

/**
 * Task sorting fields enum - whitelist allowed columns to prevent invalid queries
 */
enum TaskSortField {
  ID = 'id',
  TITLE = 'title',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

/**
 * Filters for task queries
 */
export class TaskFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

/**
 * Sorting configuration
 */
export class TaskSortDto extends EntitySortDto<TaskSortField> {
  @IsOptional()
  @IsEnum(TaskSortField)
  field?: TaskSortField = TaskSortField.CREATED_AT;
}

/**
 * Complete task list query DTO with filtering, sorting, and pagination
 */
export class TaskListRequestDto extends EntityListRequestDto<
  TaskFilterDto,
  TaskSortDto
> {
  @IsOptional()
  @Type(() => TaskFilterDto)
  declare filter?: TaskFilterDto;

  @IsOptional()
  @Type(() => TaskSortDto)
  @ValidateNested()
  declare sort?: TaskSortDto;
}
