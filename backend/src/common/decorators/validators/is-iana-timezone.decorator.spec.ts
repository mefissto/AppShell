import { validate } from 'class-validator';
import 'reflect-metadata';

import { IsIanaTimezone } from './is-iana-timezone.decorator';

class IanaTimezoneDto {
  @IsIanaTimezone()
  timezone!: unknown;
}

describe('IsIanaTimezone', () => {
  it('accepts a valid IANA timezone', async () => {
    const dto = Object.assign(new IanaTimezoneDto(), {
      timezone: 'Europe/Berlin',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid IANA timezone', async () => {
    const dto = Object.assign(new IanaTimezoneDto(), {
      timezone: 'Invalid/Timezone',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'timezone')).toBeDefined();
  });

  it('rejects invalid format', async () => {
    const dto = Object.assign(new IanaTimezoneDto(), {
      timezone: 'UTC',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'timezone')).toBeDefined();
  });
});
