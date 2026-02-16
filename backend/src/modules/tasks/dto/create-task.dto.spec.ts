import { TaskStatus } from '@generated/prisma';
import { validate } from 'class-validator';
import 'reflect-metadata';

import { CreateTaskDto } from './create-task.dto';

describe('CreateTaskDto', () => {
  const makeDto = (overrides: Partial<CreateTaskDto> = {}) =>
    Object.assign(new CreateTaskDto(), {
      title: 'Test task title',
      description: 'Test task description',
      status: TaskStatus.PENDING,
      ...overrides,
    });

  it('passes validation with valid data', async () => {
    const dto = makeDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows description to be optional', async () => {
    const dto = makeDto({ description: undefined });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows status to be optional', async () => {
    const dto = makeDto({ status: undefined as unknown as TaskStatus });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails when title is missing', async () => {
    const dto = makeDto({ title: '' });

    const errors = await validate(dto);
    const titleError = errors.find((e) => e.property === 'title');

    expect(titleError).toBeDefined();
  });

  it('fails when title is not a string', async () => {
    const dto = makeDto({ title: 123 as unknown as string });

    const errors = await validate(dto);
    const titleError = errors.find((e) => e.property === 'title');

    expect(titleError).toBeDefined();
  });

  it('fails when title exceeds 255 characters', async () => {
    const dto = makeDto({ title: 'a'.repeat(256) });

    const errors = await validate(dto);
    const titleError = errors.find((e) => e.property === 'title');

    expect(titleError).toBeDefined();
  });

  it('fails when description is not a string', async () => {
    const dto = makeDto({ description: 123 as unknown as string });

    const errors = await validate(dto);
    const descriptionError = errors.find((e) => e.property === 'description');

    expect(descriptionError).toBeDefined();
  });

  it('fails when status is invalid', async () => {
    const dto = makeDto({ status: 'INVALID_STATUS' as unknown as TaskStatus });

    const errors = await validate(dto);
    const statusError = errors.find((e) => e.property === 'status');

    expect(statusError).toBeDefined();
  });
});
