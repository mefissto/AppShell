import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { IsBcp47LanguageTag } from '@decorators/is-bcp47-language-tag.decorator';
import { IsIanaTimezone } from '@decorators/is-iana-timezone.decorator';

export class UpdateProfileDto {
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
}
