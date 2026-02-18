import { validate } from 'class-validator';
import 'reflect-metadata';

import { CreateTagDto } from './create-tag.dto';

describe('CreateTagDto', () => {
  const makeDto = (overrides: Partial<CreateTagDto> = {}) =>
    Object.assign(new CreateTagDto(), {
      name: 'Urgent',
      color: '#ff0000',
      ...overrides,
    });

  it('passes validation with valid data', async () => {
    const dto = makeDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows color to be optional', async () => {
    const dto = makeDto({ color: undefined });

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

  it('fails when name exceeds 24 characters', async () => {
    const dto = makeDto({ name: 'a'.repeat(25) });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('fails when color is not a string', async () => {
    const dto = makeDto({ color: 123 as unknown as string });

    const errors = await validate(dto);
    const colorError = errors.find((e) => e.property === 'color');

    expect(colorError).toBeDefined();
  });
});
