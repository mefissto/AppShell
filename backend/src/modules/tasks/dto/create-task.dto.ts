import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { IsCuid } from '@decorators/is-cuid.decorator';
import { TaskStatus } from '@generated/prisma';

/**
 * Data Transfer Object for creating a new task.
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'Title of the task.',
    example: 'Finish onboarding guide',
    maxLength: 255,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must be at most 255 characters long' })
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the task.',
    example: 'Read docs and set up project',
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Current status of the task.',
    enum: TaskStatus,
    enumName: 'TaskStatus',
    example: TaskStatus.PENDING,
  })
  @IsEnum(TaskStatus, { message: 'Status must be a valid TaskStatus' })
  @IsOptional()
  status: TaskStatus;

  @ApiPropertyOptional({
    description: 'Array of tag IDs to associate with the task.',
    example: ['tag-1', 'tag-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tag IDs must be an array' })
  @ArrayUnique({ message: 'Tag IDs must be unique' })
  @IsCuid({ each: true, message: 'Each tag ID must be a valid CUID' })
  tagIds?: string[];
}
