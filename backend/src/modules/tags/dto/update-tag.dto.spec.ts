import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateTagDto } from './update-tag.dto';

describe('UpdateTagDto', () => {
  const makeDto = (overrides: Partial<UpdateTagDto> = {}) =>
    Object.assign(new UpdateTagDto(), overrides);

  it('allows all fields to be optional', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only name with valid value', async () => {
    const dto = makeDto({ name: 'Important' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only color with valid value', async () => {
    const dto = makeDto({ color: '#00ff00' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
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
