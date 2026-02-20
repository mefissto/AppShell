import { validate } from 'class-validator';
import 'reflect-metadata';

import { IsBcp47LanguageTag } from './is-bcp47-language-tag.decorator';

class LanguageTagDto {
  @IsBcp47LanguageTag()
  language!: unknown;
}

describe('IsBcp47LanguageTag', () => {
  it('accepts a valid language tag', async () => {
    const dto = Object.assign(new LanguageTagDto(), {
      language: 'en-US',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid language tag', async () => {
    const dto = Object.assign(new LanguageTagDto(), {
      language: 'english_us',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'language')).toBeDefined();
  });

  it('rejects non-string values', async () => {
    const dto = Object.assign(new LanguageTagDto(), {
      language: 42,
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'language')).toBeDefined();
  });
});
