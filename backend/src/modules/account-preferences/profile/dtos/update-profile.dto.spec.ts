import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  const makeDto = (overrides: Partial<UpdateProfileDto> = {}) =>
    Object.assign(new UpdateProfileDto(), overrides);

  it('allows all fields to be optional', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts valid values', async () => {
    const dto = makeDto({
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      timezone: 'Europe/Berlin',
      language: 'en-US',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects firstName longer than 50 chars', async () => {
    const dto = makeDto({ firstName: 'a'.repeat(51) });

    const errors = await validate(dto);
    const firstNameError = errors.find(
      (error) => error.property === 'firstName',
    );

    expect(firstNameError).toBeDefined();
  });

  it('rejects displayName longer than 100 chars', async () => {
    const dto = makeDto({ displayName: 'a'.repeat(101) });

    const errors = await validate(dto);
    const displayNameError = errors.find(
      (error) => error.property === 'displayName',
    );

    expect(displayNameError).toBeDefined();
  });

  it('rejects invalid timezone', async () => {
    const dto = makeDto({ timezone: 'Invalid/Timezone' });

    const errors = await validate(dto);
    const timezoneError = errors.find((error) => error.property === 'timezone');

    expect(timezoneError).toBeDefined();
  });

  it('rejects invalid language tag', async () => {
    const dto = makeDto({ language: 'invalid_tag_' });

    const errors = await validate(dto);
    const languageError = errors.find((error) => error.property === 'language');

    expect(languageError).toBeDefined();
  });

  it('rejects non-string avatarUrl', async () => {
    const dto = makeDto({ avatarUrl: 123 as unknown as string });

    const errors = await validate(dto);
    const avatarUrlError = errors.find(
      (error) => error.property === 'avatarUrl',
    );

    expect(avatarUrlError).toBeDefined();
  });
});
