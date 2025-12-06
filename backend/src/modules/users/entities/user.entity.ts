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

  constructor(partial: Partial<UserEntity>) {
    super();
    Object.assign(this, this.filterNullishValues(partial));
  }
}
