import { IsNotEmpty } from 'class-validator';

import { IsCuid } from '@decorators/is-cuid.decorator';

export class UpdateOwnerDto {
  @IsNotEmpty({ message: 'ownerId is required' })
  @IsCuid({ message: 'ownerId must be a valid CUID' })
  ownerId: string;
}
