import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { IsValidMetadata } from '@decorators/validators/is-valid-metadata.decorator';
import { Prisma } from '@generated/prisma';

export class CreateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(3, { message: 'Project name must be at least 3 characters long' })
  @MaxLength(255, {
    message: 'Project name must be at most 255 characters long',
  })
  name: string;

  @IsString({ message: 'Project description must be a string' })
  @MaxLength(1000, {
    message: 'Project description must be at most 1000 characters long',
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Optional project metadata. Allowed top-level namespace is `custom` only.',
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
