export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    cause: unknown,
    public readonly retryable: boolean,
    public readonly retryAfterMs?: number,
  ) {
    super(message, { cause });
    this.name = 'EmailDeliveryError';
  }
}
