import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { IsBefore } from '@decorators/validators/is-before.decorator';
import { IsCuid } from '@decorators/validators/is-cuid.decorator';
import { IsValidMetadata } from '@decorators/validators/is-valid-metadata.decorator';
import { Prisma, TaskStatus } from '@generated/prisma';

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

  @ApiPropertyOptional({
    description: 'Due date of the task.',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'Due date must be a valid ISO 8601 date string' },
  )
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Reminder date for the task.',
    example: '2024-12-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'Reminder date must be a valid ISO 8601 date string' },
  )
  @IsBefore('dueDate', {
    message: 'Reminder date must be equal to or before the due date',
  })
  remindAt?: Date;

  @ApiPropertyOptional({
    description:
      'Optional task metadata. Allowed top-level namespace is `custom` only.',
    example: {
      custom: {
        source: 'imported',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  @IsValidMetadata(
    {
      maxSizeInBytes: 8 * 1024, // 8KB
      allowedNamespaces: ['custom'],
      forbiddenKeys: ['password', 'token', 'refreshToken', 'authorization'],
    },
    {
      message:
        'Metadata exceeds constraints: max size 8KB, allowed namespace custom only, and forbidden keys password/token/refreshToken/authorization',
    },
  )
  metadata?: Prisma.JsonObject;
}
