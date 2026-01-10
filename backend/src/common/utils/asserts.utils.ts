/**
 * Asserts that a value exists (is neither null nor undefined).
 * If the value does not exist, an error is thrown with the provided message.
 * @param value - The value to check for existence.
 * @param message - The error message to throw if the value does not exist.
 * @returns The value if it exists.
 * @throws Error if the value is null or undefined.
 */
export function castExists<T>(
  value: T | null | undefined,
  message = 'Value does not exist',
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}
