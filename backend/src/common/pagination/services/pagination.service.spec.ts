import { EntityListRequestDto } from '@pagination/interfaces/entity-list-request.dto';

import { PaginationService } from './pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(() => {
    service = new PaginationService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build default pagination response', () => {
    const result = service.buildResponse([1, 2], 2, new EntityListRequestDto());

    expect(result).toEqual({
      data: [1, 2],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('should build custom pagination response', () => {
    const request = new EntityListRequestDto();
    request.pagination = { page: 2, limit: 5 } as EntityListRequestDto['pagination'];

    const result = service.buildResponse(['a', 'b'], 12, request);

    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
