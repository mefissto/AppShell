import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateProjectDto } from './update-project.dto';

describe('UpdateProjectDto', () => {
  const makeDto = (overrides: Partial<UpdateProjectDto> = {}) =>
    Object.assign(new UpdateProjectDto(), overrides);

  it('allows all fields to be optional', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only name with valid value', async () => {
    const dto = makeDto({ name: 'Updated project name' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only description with valid value', async () => {
    const dto = makeDto({ description: 'Updated description' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('validates inherited name min length when provided', async () => {
    const dto = makeDto({ name: 'ab' });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('validates inherited name max length when provided', async () => {
    const dto = makeDto({ name: 'a'.repeat(256) });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('validates inherited description max length when provided', async () => {
    const dto = makeDto({ description: 'a'.repeat(1001) });

    const errors = await validate(dto);
    const descriptionError = errors.find((e) => e.property === 'description');

    expect(descriptionError).toBeDefined();
  });

  it('passes validation when ownerId is a valid CUID', async () => {
    const dto = makeDto({ ownerId: 'c1234567890abcdefghijklmn' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails when ownerId is not a valid CUID', async () => {
    const dto = makeDto({ ownerId: 'not-a-cuid' });

    const errors = await validate(dto);
    const ownerIdError = errors.find((e) => e.property === 'ownerId');

    expect(ownerIdError).toBeDefined();
  });
});
