import { BaseEntity } from '@entities/base.entity';

export class ProfileEntity extends BaseEntity {
  userId: string;
  timezone: string;
  language: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;

  constructor(partial: Partial<ProfileEntity>) {
    super();
    Object.assign(this, ProfileEntity.filterNullishValues(partial));
  }
}
