import { ThemePreference } from '@generated/prisma';
import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateSettingsDto } from './update-settings.dto';

describe('UpdateSettingsDto', () => {
  const makeDto = (overrides: Partial<UpdateSettingsDto> = {}) =>
    Object.assign(new UpdateSettingsDto(), overrides);

  it('allows all fields to be optional', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts valid theme and boolean values', async () => {
    const dto = makeDto({
      theme: ThemePreference.DARK,
      notificationsEnabled: true,
      emailNotificationsEnabled: false,
      pushNotificationsEnabled: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects non-boolean notificationsEnabled', async () => {
    const dto = makeDto({ notificationsEnabled: 1 as unknown as boolean });

    const errors = await validate(dto);
    const notificationsError = errors.find(
      (error) => error.property === 'notificationsEnabled',
    );

    expect(notificationsError).toBeDefined();
  });

  it('rejects non-boolean emailNotificationsEnabled', async () => {
    const dto = makeDto({
      emailNotificationsEnabled: 123 as unknown as boolean,
    });

    const errors = await validate(dto);
    const emailError = errors.find(
      (error) => error.property === 'emailNotificationsEnabled',
    );

    expect(emailError).toBeDefined();
  });

  it('rejects invalid theme value', async () => {
    const dto = makeDto({ theme: 'BLUE' as unknown as ThemePreference });

    const errors = await validate(dto);
    const themeError = errors.find((error) => error.property === 'theme');

    expect(themeError).toBeDefined();
  });
});
