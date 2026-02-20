import { validate } from 'class-validator';
import 'reflect-metadata';

import { IsValidMetadata } from './is-valid-metadata.decorator';

class MetadataDto {
  @IsValidMetadata({
    maxSizeInBytes: 8 * 1024,
    allowedNamespaces: ['custom'],
    forbiddenKeys: ['password', 'token', 'refreshToken', 'authorization'],
  })
  metadata?: Record<string, unknown>;
}

class MetadataWithLimitsDto {
  @IsValidMetadata({
    maxSizeInBytes: 8 * 1024,
    allowedNamespaces: ['custom'],
    maxDepth: 2,
    maxKeys: 3,
  })
  metadata?: Record<string, unknown>;
}

class MetadataWithDefaultsDto {
  @IsValidMetadata()
  metadata?: Record<string, unknown>;
}

describe('IsValidMetadata', () => {
  const validateDto = async (metadata: Record<string, unknown>) => {
    const dto = Object.assign(new MetadataDto(), { metadata });
    return validate(dto);
  };

  it('accepts valid metadata', async () => {
    const errors = await validateDto({
      custom: {
        source: 'imported',
      },
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects metadata larger than max size', async () => {
    const errors = await validateDto({
      custom: {
        payload: 'x'.repeat(9 * 1024),
      },
    });

    expect(errors.find((e) => e.property === 'metadata')).toBeDefined();
  });

  it('rejects non-allowed root namespace', async () => {
    const errors = await validateDto({
      system: {
        source: 'internal',
      },
    });

    expect(errors.find((e) => e.property === 'metadata')).toBeDefined();
  });

  it('rejects forbidden key at any depth', async () => {
    const errors = await validateDto({
      custom: {
        auth: {
          authorization: 'Bearer token',
        },
      },
    });

    expect(errors.find((e) => e.property === 'metadata')).toBeDefined();
  });

  it('supports optional max depth', async () => {
    const dto = Object.assign(new MetadataWithLimitsDto(), {
      metadata: {
        custom: {
          nested: {
            tooDeep: true,
          },
        },
      },
    });

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'metadata')).toBeDefined();
  });

  it('supports optional max keys', async () => {
    const dto = Object.assign(new MetadataWithLimitsDto(), {
      metadata: {
        custom: {
          a: 1,
          b: 2,
          c: 3,
          d: 4,
        },
      },
    });

    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'metadata')).toBeDefined();
  });

  it('uses default config when no config is provided', async () => {
    const validDto = Object.assign(new MetadataWithDefaultsDto(), {
      metadata: {
        custom: {
          source: 'imported',
        },
      },
    });

    const invalidDto = Object.assign(new MetadataWithDefaultsDto(), {
      metadata: {
        system: {
          source: 'internal',
        },
      },
    });

    const [validErrors, invalidErrors] = await Promise.all([
      validate(validDto),
      validate(invalidDto),
    ]);

    expect(validErrors).toHaveLength(0);
    expect(invalidErrors.find((e) => e.property === 'metadata')).toBeDefined();
  });
});
