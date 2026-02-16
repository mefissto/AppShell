import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validates that a string is a valid BCP-47 language tag.
 *
 * Example valid values:
 * - en
 * - en-US
 * - sr-Latn
 */
export function IsBcp47LanguageTag(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBcp47LanguageTag',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          try {
            return Intl.getCanonicalLocales(value).length > 0;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return `${propertyName} must be a valid BCP-47 language tag (e.g. en or en-US)`;
        },
      },
    });
  };
}
