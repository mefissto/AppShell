import { validate } from 'class-validator';
import 'reflect-metadata';

import { IsCuid } from './is-cuid.decorator';

class CuidDto {
  @IsCuid()
  id!: unknown;
}

describe('IsCuid', () => {
  it('accepts a valid cuid string', async () => {
    const dto = Object.assign(new CuidDto(), {
      id: 'c1234567890abcdef12345678',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid cuid strings', async () => {
    const dto = Object.assign(new CuidDto(), {
      id: 'invalid-cuid',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'id')).toBeDefined();
  });

  it('rejects non-string values', async () => {
    const dto = Object.assign(new CuidDto(), {
      id: 123,
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'id')).toBeDefined();
  });
});
