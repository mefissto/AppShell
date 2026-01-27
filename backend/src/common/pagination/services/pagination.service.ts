import { Injectable } from '@nestjs/common';

import { EntityListRequestDto } from '@pagination/interfaces/entity-list-request.dto';
import { EntityListResponseDto } from '@pagination/interfaces/entity-list-response.dto';

/**
 * Service for building paginated responses
 */
@Injectable()
export class PaginationService {
  /**
   * Builds a paginated response with data and metadata
   */
  buildResponse<T>(
    data: T[],
    total: number,
    listRequest: EntityListRequestDto<unknown, unknown>,
  ): EntityListResponseDto<T> {
    const page = listRequest.pagination?.page ?? 1;
    const limit = listRequest.pagination?.limit ?? 10;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
