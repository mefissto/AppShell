import { EntityListRequestDto } from '@pagination/interfaces/entity-list-request.dto';

// TODO: Review and enhance all logic related to pagination, sorting, and filtering
declare interface EntityQuery {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take: number;
  skip: number;
}

export class EntityListRequestBuilder<TFilter = unknown, TSort = unknown> {
  private entityQuery: EntityQuery = {
    take: 10,
    skip: 0,
  };

  constructor(
    private readonly listRequestDto: EntityListRequestDto<TFilter, TSort>,
  ) {}

  build(): EntityQuery {
    return this.entityQuery;
  }

  addFilter(
    transformFilter?: (filter: TFilter) => Record<string, unknown>,
  ): this {
    if (this.listRequestDto.filter) {
      this.entityQuery.where = transformFilter
        ? transformFilter(this.listRequestDto.filter)
        : (this.listRequestDto.filter as Record<string, unknown>);
    }
    return this;
  }

  addSort(
    transformSort?: (sort: TSort) => Record<string, 'asc' | 'desc'>,
  ): this {
    if (this.listRequestDto.sort) {
      this.entityQuery.orderBy = transformSort
        ? transformSort(this.listRequestDto.sort)
        : this.defaultSort();
    }
    return this;
  }

  private defaultSort(): Record<string, 'asc' | 'desc'> | undefined {
    const sort = this.listRequestDto.sort as any;
    if (sort?.field) {
      const field = sort.field as string;
      const direction = sort.direction || 'desc';
      return { [field]: direction };
    }
    return undefined;
  }

  addPagination(): this {
    const pagination = this.listRequestDto.pagination;
    if (pagination) {
      const page = Math.max(1, pagination.page ?? 1);
      const limit = Math.min(100, Math.max(1, pagination.limit ?? 10));

      // Prevent excessively large offsets that could cause performance issues
      const skip = (page - 1) * limit;
      const maxOffset = 10000; // Configurable max offset

      this.entityQuery.take = limit;
      this.entityQuery.skip = Math.min(skip, maxOffset);
    }
    return this;
  }
}
