import { BaseEntity } from '@entities/base.entity';

export class TagEntity extends BaseEntity {
  userId: string;
  name: string;
  color: string | null;

  constructor(partial: Partial<TagEntity>) {
    super();
    Object.assign(this, TagEntity.filterNullishValues(partial));
  }
}
