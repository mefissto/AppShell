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
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Sensitive properties excluded from API documentation and serialization
   */
  @ApiHideProperty()
  @Exclude()
  password?: string;
  @ApiHideProperty()
  @Exclude()
  emailVerificationToken?: string | null;
  @ApiHideProperty()
  @Exclude()
  emailVerificationTokenExpiresAt?: Date | null;

  constructor(partial: Partial<UserEntity>) {
    super();
    Object.assign(this, this.filterNullishValues(partial));
  }
}
