import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';

import { TaskListRequestDto } from './task-list-request.dto';

describe('TaskListRequestDto', () => {
  it('passes validation with valid filter, sort, and pagination', async () => {
    const dto = plainToInstance(TaskListRequestDto, {
      filter: {
        search: 'test',
        title: 'task',
        status: 'PENDING',
      },
      sort: {
        field: 'updatedAt',
        direction: 'asc',
      },
      pagination: {
        page: 1,
        limit: 10,
      },
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation when empty', async () => {
    const dto = plainToInstance(TaskListRequestDto, {});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails when sort field is invalid', async () => {
    const dto = plainToInstance(TaskListRequestDto, {
      sort: {
        field: 'invalidField',
      },
    });

    const errors = await validate(dto);
    const sortError = errors.find((e) => e.property === 'sort');

    expect(sortError).toBeDefined();
  });

  it('fails when sort direction is invalid', async () => {
    const dto = plainToInstance(TaskListRequestDto, {
      sort: {
        direction: 'upward',
      },
    });

    const errors = await validate(dto);
    const sortError = errors.find((e) => e.property === 'sort');

    expect(sortError).toBeDefined();
  });

  it('fails when pagination page is less than 1', async () => {
    const dto = plainToInstance(TaskListRequestDto, {
      pagination: {
        page: 0,
      },
    });

    const errors = await validate(dto);
    const paginationError = errors.find((e) => e.property === 'pagination');

    expect(paginationError).toBeDefined();
  });

  it('fails when pagination limit exceeds max value', async () => {
    const dto = plainToInstance(TaskListRequestDto, {
      pagination: {
        limit: 101,
      },
    });

    const errors = await validate(dto);
    const paginationError = errors.find((e) => e.property === 'pagination');

    expect(paginationError).toBeDefined();
  });
});
