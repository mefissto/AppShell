import { IsNotEmpty } from 'class-validator';

import { IsCuid } from '@decorators/is-cuid.decorator';

export class AssignToProjectDto {
  @IsNotEmpty({ message: 'projectId is required' })
  @IsCuid({ message: 'projectId must be a valid CUID' })
  projectId: string | null;
}
