import { IsEnum, IsOptional } from 'class-validator';

/**
 * Sort direction enum
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Sorting configuration
 */
export class EntitySortDto<TField> {
  @IsOptional()
  @IsEnum(SortDirection)
  direction?: SortDirection = SortDirection.DESC;

  @IsOptional()
  field?: TField;
}
