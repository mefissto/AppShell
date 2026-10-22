/**
 * Calculates the exponential delay based on the attempt number.
 * @param attemptNumber - The current attempt number (1-based).
 * @param baseDelay - The base delay in minutes (default is 1 minute).
 * @param maxDelay - The maximum delay in minutes (default is 30 minutes).
 * @returns The calculated delay in minutes.
 */
export function exponentialDelay(
  attemptNumber: number,
  baseDelay: number = 1, // in minutes
  maxDelay: number = 30, // in minutes
): number {
  return Math.min(baseDelay * 2 ** (attemptNumber - 1), maxDelay);
}
