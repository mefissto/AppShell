import { PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { IsCuid } from '@decorators/is-cuid.decorator';

import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsCuid({ message: 'ownerId must be a valid CUID' })
  ownerId?: string;
}
