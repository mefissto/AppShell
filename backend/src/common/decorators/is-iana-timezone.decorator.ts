import { registerDecorator, ValidationOptions } from 'class-validator';

const IANA_TIMEZONE_FORMAT_REGEX =
  /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)+$/;

let cachedSupportedTimezones: Set<string> | null = null;

function getSupportedTimezones(): Set<string> | null {
  if (cachedSupportedTimezones) {
    return cachedSupportedTimezones;
  }

  if (typeof Intl.supportedValuesOf === 'function') {
    cachedSupportedTimezones = new Set(Intl.supportedValuesOf('timeZone'));

    return cachedSupportedTimezones;
  }

  return null;
}

function isValidIanaTimezone(value: string): boolean {
  if (!IANA_TIMEZONE_FORMAT_REGEX.test(value)) {
    return false;
  }

  const supportedTimezones = getSupportedTimezones();

  if (supportedTimezones) {
    return supportedTimezones.has(value);
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a string is a real IANA timezone identifier.
 *
 * Example valid values:
 * - Europe/Berlin
 * - America/New_York
 */
export function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidIanaTimezone(value);
        },
        defaultMessage() {
          return `${propertyName} must be a valid IANA timezone (e.g. Europe/Berlin)`;
        },
      },
    });
  };
}
