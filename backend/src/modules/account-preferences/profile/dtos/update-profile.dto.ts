import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { IsBcp47LanguageTag } from '@decorators/validators/is-bcp47-language-tag.decorator';
import { IsIanaTimezone } from '@decorators/validators/is-iana-timezone.decorator';
import { IsValidMetadata } from '@decorators/validators/is-valid-metadata.decorator';
import { Prisma } from '@generated/prisma';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  @IsIanaTimezone()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @IsBcp47LanguageTag()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({
    description:
      'Optional profile metadata. Allowed top-level namespace is `custom` only.',
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
