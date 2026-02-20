import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';

const DEFAULT_FORBIDDEN_KEYS = [
  'password',
  'token',
  'refreshToken',
  'authorization',
] as const;

export type MetadataValidationConfig = {
  maxSizeInBytes?: number;
  allowedNamespaces?: string[];
  forbiddenKeys?: string[];
  maxDepth?: number;
  maxKeys?: number;
};

const DEFAULT_METADATA_VALIDATION_CONFIG: Required<
  Pick<
    MetadataValidationConfig,
    'maxSizeInBytes' | 'allowedNamespaces' | 'forbiddenKeys'
  >
> = {
  maxSizeInBytes: 8 * 1024,
  allowedNamespaces: ['custom'],
  forbiddenKeys: [...DEFAULT_FORBIDDEN_KEYS],
};

type NormalizedMetadataValidationConfig = {
  maxSizeInBytes: number;
  allowedNamespaces: Set<string>;
  forbiddenKeys: Set<string>;
  maxDepth?: number;
  maxKeys?: number;
};

function normalizeConfig(
  config: MetadataValidationConfig,
): NormalizedMetadataValidationConfig {
  const mergedConfig = {
    ...DEFAULT_METADATA_VALIDATION_CONFIG,
    ...config,
  };

  return {
    maxSizeInBytes: mergedConfig.maxSizeInBytes,
    allowedNamespaces: new Set(
      mergedConfig.allowedNamespaces.map((namespace) =>
        namespace.toLowerCase(),
      ),
    ),
    forbiddenKeys: new Set(
      mergedConfig.forbiddenKeys.map((key) => key.toLowerCase()),
    ),
    maxDepth: config.maxDepth,
    maxKeys: config.maxKeys,
  };
}

function getJsonByteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getMaxDepth(value: unknown): number {
  if (!isRecord(value) && !Array.isArray(value)) {
    return 0;
  }

  const items = Array.isArray(value) ? value : Object.values(value);

  if (items.length === 0) {
    return 1;
  }

  let maxChildDepth = 0;
  for (const item of items) {
    maxChildDepth = Math.max(maxChildDepth, getMaxDepth(item));
  }

  return 1 + maxChildDepth;
}

function countKeys(value: unknown): number {
  if (!isRecord(value) && !Array.isArray(value)) {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc + countKeys(item), 0);
  }

  let total = Object.keys(value).length;
  for (const item of Object.values(value)) {
    total += countKeys(item);
  }

  return total;
}

function hasForbiddenKey(
  value: unknown,
  forbiddenKeys: Set<string>,
  isRoot = false,
  allowedNamespaces?: Set<string>,
): boolean {
  if (!isRecord(value) && !Array.isArray(value)) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) =>
      hasForbiddenKey(item, forbiddenKeys, false, allowedNamespaces),
    );
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (forbiddenKeys.has(normalizedKey)) {
      return true;
    }

    if (isRoot && allowedNamespaces && !allowedNamespaces.has(normalizedKey)) {
      return true;
    }

    if (hasForbiddenKey(nestedValue, forbiddenKeys, false, allowedNamespaces)) {
      return true;
    }
  }

  return false;
}

export function IsValidMetadata(
  config: MetadataValidationConfig = {},
  validationOptions?: ValidationOptions,
) {
  const normalizedConfig = normalizeConfig(config);

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMetadata',
      target: object.constructor,
      propertyName,
      constraints: [normalizedConfig],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value == null) {
            return true;
          }

          if (!isRecord(value)) {
            return false;
          }

          const [resolvedConfig] = args.constraints as [
            NormalizedMetadataValidationConfig,
          ];

          if (getJsonByteSize(value) > resolvedConfig.maxSizeInBytes) {
            return false;
          }

          if (
            hasForbiddenKey(
              value,
              resolvedConfig.forbiddenKeys,
              true,
              resolvedConfig.allowedNamespaces,
            )
          ) {
            return false;
          }

          if (
            resolvedConfig.maxDepth != null &&
            getMaxDepth(value) > resolvedConfig.maxDepth
          ) {
            return false;
          }

          if (
            resolvedConfig.maxKeys != null &&
            countKeys(value) > resolvedConfig.maxKeys
          ) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [resolvedConfig] = args.constraints as [
            NormalizedMetadataValidationConfig,
          ];

          return `${args.property} must be an object within ${resolvedConfig.maxSizeInBytes} bytes, use only allowed namespaces (${Array.from(resolvedConfig.allowedNamespaces).join(', ')}), avoid forbidden keys (${Array.from(resolvedConfig.forbiddenKeys).join(', ')}), and respect optional depth/key limits`;
        },
      },
    });
  };
}
