import { validate } from 'class-validator';
import 'reflect-metadata';

import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  const makeDto = (overrides: Partial<CreateUserDto> = {}) =>
    Object.assign(new CreateUserDto(), {
      name: 'Jane Doe',
      email: 'user@example.com',
      password: 'StrongP@ssw0rd!',
      ...overrides,
    });

  it('passes validation with valid data', async () => {
    const dto = makeDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('allows name to be optional', async () => {
    const dto = makeDto({ name: undefined as unknown as string });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails when name is not a string', async () => {
    const dto = makeDto({ name: 123 as unknown as string });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('fails when name exceeds max length', async () => {
    const dto = makeDto({ name: 'a'.repeat(65) });

    const errors = await validate(dto);
    const nameError = errors.find((e) => e.property === 'name');

    expect(nameError).toBeDefined();
  });

  it('fails when email is missing', async () => {
    const dto = makeDto({ email: '' });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');

    expect(emailError).toBeDefined();
  });

  it('fails when email is not a string', async () => {
    const dto = makeDto({ email: 123 as unknown as string });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');

    expect(emailError).toBeDefined();
  });

  it('fails when password is missing', async () => {
    const dto = makeDto({ password: '' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when password is not a string', async () => {
    const dto = makeDto({ password: 123 as unknown as string });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when email format is invalid', async () => {
    const dto = makeDto({ email: 'not-an-email' });

    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');

    expect(emailError).toBeDefined();
  });

  it('fails when password is too short', async () => {
    const dto = makeDto({ password: 'short' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when password lacks complexity', async () => {
    const dto = makeDto({ password: 'alllowercase' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when password lacks uppercase', async () => {
    const dto = makeDto({ password: 'weakpassword1!' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when password lacks lowercase', async () => {
    const dto = makeDto({ password: 'WEAKPASSWORD1!' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when password lacks number', async () => {
    const dto = makeDto({ password: 'WeakPassword!' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });

  it('fails when password lacks symbol', async () => {
    const dto = makeDto({ password: 'WeakPassword1' });

    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');

    expect(passwordError).toBeDefined();
  });
});
