import { registerDecorator, ValidationOptions } from 'class-validator';

const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Custom decorator to validate that a string is a CUID (Collision-resistant Unique Identifier).
 * A CUID is a 25-character string that starts with 'c' followed by 24 lowercase letters or digits.
 * Example of a valid CUID: 'c1234567890abcdef1234567'
 *
 * @param validationOptions Optional validation options to customize the error message.
 * @returns A property decorator function.
 */
export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && CUID_REGEX.test(value);
        },
        defaultMessage() {
          return `${propertyName} must be a valid CUID`;
        },
      },
    });
  };
}
