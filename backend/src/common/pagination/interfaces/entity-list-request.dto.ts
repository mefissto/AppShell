import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import { EntityFilterDto } from './entity-filter.dto';
import { EntityPaginationDto } from './entity-pagination.dto';
import { EntitySortDto } from './entity-sort.dto';

export class EntityListRequestDto<
  TFilter = EntityFilterDto,
  TSort = EntitySortDto<unknown>,
> {
  @IsOptional()
  filter?: TFilter;

  @IsOptional()
  sort?: TSort;

  @IsOptional()
  @Type(() => EntityPaginationDto)
  @ValidateNested()
  pagination?: EntityPaginationDto = new EntityPaginationDto();
}
