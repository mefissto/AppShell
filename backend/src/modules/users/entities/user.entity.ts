import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { BaseEntity } from '@entities/base.entity';

/**
 * User Entity representing a user in the system.
 */
export class UserEntity extends BaseEntity {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;

  @ApiHideProperty()
  @Exclude()
  password?: string;

  constructor(partial: Partial<UserEntity>) {
    super();
    Object.assign(this, this.filterNullishValues(partial));
  }
}
