import { validate } from 'class-validator';
import 'reflect-metadata';

import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  const makeDto = (overrides: Partial<CreateProjectDto> = {}) =>
    Object.assign(new CreateProjectDto(), {
      name: 'Project Name',
      description: 'Project description',
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

  it('fails when name is missing', async () => {
    const dto = makeDto({ name: '' });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('fails when name is not a string', async () => {
    const dto = makeDto({ name: 123 as unknown as string });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('fails when name is shorter than 3 characters', async () => {
    const dto = makeDto({ name: 'ab' });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('fails when name exceeds 255 characters', async () => {
    const dto = makeDto({ name: 'a'.repeat(256) });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('fails when description is not a string', async () => {
    const dto = makeDto({ description: 123 as unknown as string });

    const errors = await validate(dto);
    const descriptionError = errors.find((e) => e.property === 'description');

    expect(descriptionError).toBeDefined();
  });

  it('fails when description exceeds 1000 characters', async () => {
    const dto = makeDto({ description: 'a'.repeat(1001) });

    const errors = await validate(dto);
    const descriptionError = errors.find((e) => e.property === 'description');

    expect(descriptionError).toBeDefined();
  });
});
