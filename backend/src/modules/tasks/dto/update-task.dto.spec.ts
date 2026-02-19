import { TaskStatus } from '@generated/prisma';
import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateTaskDto } from './update-task.dto';

describe('UpdateTaskDto', () => {
  const makeDto = (overrides: Partial<UpdateTaskDto> = {}) =>
    Object.assign(new UpdateTaskDto(), overrides);

  it('allows all fields to be optional', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only title with valid value', async () => {
    const dto = makeDto({ title: 'Updated task title' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only description with valid value', async () => {
    const dto = makeDto({ description: 'Updated description' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only status with valid value', async () => {
    const dto = makeDto({ status: TaskStatus.IN_PROGRESS });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
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

  it('fails when dueAt uses a non-ISO separator', async () => {
    const dto = makeDto({
      dueAt: '2026-02-02 19:00:00.000' as unknown as Date,
    });

    const errors = await validate(dto);
    const dueAtError = errors.find((e) => e.property === 'dueAt');

    expect(dueAtError).toBeDefined();
  });
});
