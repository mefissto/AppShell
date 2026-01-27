import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  const makeDto = (overrides: Partial<UpdateUserDto> = {}) =>
    Object.assign(new UpdateUserDto(), overrides);

  it('allows all fields to be optional', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only email', async () => {
    const dto = makeDto({ email: 'newemail@example.com' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows updating only name', async () => {
    const dto = makeDto({ name: 'Updated Name' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('validates email format if provided', async () => {
    const dto = makeDto({ email: 'invalid-email' });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');

    expect(emailError).toBeDefined();
  });

  it('validates name length if provided', async () => {
    const dto = makeDto({ name: 'a'.repeat(65) });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });
});
