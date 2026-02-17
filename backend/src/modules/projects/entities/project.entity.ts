import { BaseEntity } from '@entities/base.entity';

/**
 * Project Entity representing a project in the system.
 */
export class ProjectEntity extends BaseEntity {
  name: string;
  description: string | null;
  ownerId: string;
  taskIds: string[];

  constructor(partial: Partial<ProjectEntity>) {
    super();
    Object.assign(this, ProjectEntity.filterNullishValues(partial));
  }
}
