import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  @ApiProperty({
    description: 'ID of the user who owns the task.',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @ApiPropertyOptional({
    description: 'Current status of the task.',
    enum: TaskStatus,
    enumName: 'TaskStatus',
    example: TaskStatus.PENDING,
  })
  @IsEnum(TaskStatus, { message: 'Status must be a valid TaskStatus' })
  @IsOptional()
  status: TaskStatus;
}
