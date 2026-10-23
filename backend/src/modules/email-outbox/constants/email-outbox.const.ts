export const EMAIL_OUTBOX_BATCH_SIZE = 10;
export const EMAIL_OUTBOX_LOCK_DURATION_MINUTES = 5; // in minutes
export const EMAIL_OUTBOX_LOCK_DURATION_MILLIS =
  EMAIL_OUTBOX_LOCK_DURATION_MINUTES * 60 * 1000; // lock duration in milliseconds
export const EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS = 5; // max retry attempts
