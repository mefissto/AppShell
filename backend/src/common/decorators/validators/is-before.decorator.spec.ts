import { validate } from 'class-validator';
import 'reflect-metadata';

import { IsBefore } from './is-before.decorator';

class DateRangeDto {
  @IsBefore('endAt')
  startAt?: string;

  endAt?: string;
}

describe('IsBefore', () => {
  it('accepts when current date is before related date', async () => {
    const dto = Object.assign(new DateRangeDto(), {
      startAt: '2026-02-20T10:00:00.000Z',
      endAt: '2026-02-20T11:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects when current date is not before related date', async () => {
    const dto = Object.assign(new DateRangeDto(), {
      startAt: '2026-02-20T12:00:00.000Z',
      endAt: '2026-02-20T11:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'startAt')).toBeDefined();
  });

  it('allows nullish values to be handled by other validators', async () => {
    const dto = Object.assign(new DateRangeDto(), {
      startAt: undefined,
      endAt: '2026-02-20T11:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid dates', async () => {
    const dto = Object.assign(new DateRangeDto(), {
      startAt: 'not-a-date',
      endAt: '2026-02-20T11:00:00.000Z',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'startAt')).toBeDefined();
  });
});
