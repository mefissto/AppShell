import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';

import { IsValidMetadata } from '@decorators/validators/is-valid-metadata.decorator';
import { Prisma, ThemePreference } from '@generated/prisma';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    enum: ThemePreference,
    example: ThemePreference.SYSTEM,
  })
  @IsOptional()
  @IsEnum(ThemePreference)
  theme?: ThemePreference;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional settings metadata. Allowed top-level namespace is `custom` only.',
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
