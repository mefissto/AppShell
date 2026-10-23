import { EmailTemplateError } from '@common/errors/email-template.error';
import { EmailTemplate } from '@enums/email-template.enum';

import {
  EmailOutboxPayloadData,
  EmailPayload,
  EmailPayloadData,
  EmailVerificationPayloadData,
} from '../interfaces/email-payload-data.interface';

const emailTemplates: ReadonlySet<unknown> = new Set(
  Object.values(EmailTemplate),
);

/**
 * Checks whether a value is a non-null object, excluding arrays.
 * @param value - The value to check.
 * @returns Whether the value can be inspected as an object with string keys.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a value matches any current EmailTemplate enum value.
 * @param value - The value to check, such as a Prisma JSON field.
 * @returns Whether the value is a supported email template.
 */
export function isEmailTemplate(value: unknown): value is EmailTemplate {
  return emailTemplates.has(value);
}

/**
 * Checks for string userName and verificationLink fields.
 * Does not validate URL format or require non-empty strings.
 * @param value - The value to check, such as Prisma JSON payload data.
 * @returns Whether the value has the email verification data shape.
 */
export function isEmailVerificationPayloadData(
  value: unknown,
): value is EmailVerificationPayloadData {
  return (
    isObject(value) &&
    typeof value.userName === 'string' &&
    typeof value.verificationLink === 'string'
  );
}

/**
 * Checks for a string taskTitle and a required string or null taskDueDate.
 * Does not validate date format or require non-empty strings.
 * @param value - The value to check, such as Prisma JSON payload data.
 * @returns Whether the value has the task reminder data shape.
 */
export function isEmailOutboxPayloadData(
  value: unknown,
): value is EmailOutboxPayloadData {
  return (
    isObject(value) &&
    typeof value.taskTitle === 'string' &&
    (value.taskDueDate === null || typeof value.taskDueDate === 'string')
  );
}

/**
 * Checks that a payload contains a supported template and matching data shape.
 * Additional fields are allowed on the payload and its data.
 * @param value - The value to check, such as a Prisma JSON payload.
 * @returns Whether the payload data is valid for its selected template.
 */
export function isEmailPayload(
  value: unknown,
): value is EmailPayload<EmailPayloadData> {
  if (!isObject(value) || !isEmailTemplate(value.template)) {
    return false;
  }

  switch (value.template) {
    case EmailTemplate.TASK_REMINDER:
      return isEmailOutboxPayloadData(value.data);
    case EmailTemplate.EMAIL_VERIFICATION:
      return isEmailVerificationPayloadData(value.data);
  }
}

/**
 * Asserts that a value is a supported email template.
 * @param value - The value to validate.
 * @param error - An optional custom error to throw on failure.
 * @throws The custom error, or EmailTemplateError for an unsupported template.
 */
export function assertEmailTemplate(
  value: unknown,
  error?: Error,
): asserts value is EmailTemplate {
  if (!isEmailTemplate(value)) {
    throw error ?? new EmailTemplateError('Unsupported email template');
  }
}

/**
 * Asserts that a value has the email verification data shape.
 * @param value - The payload data to validate.
 * @param error - An optional custom error to throw on failure.
 * @throws The custom error, or EmailTemplateError for invalid verification data.
 */
export function assertEmailVerificationPayloadData(
  value: unknown,
  error?: Error,
): asserts value is EmailVerificationPayloadData {
  if (!isEmailVerificationPayloadData(value)) {
    throw (
      error ?? new EmailTemplateError('Invalid email verification payload data')
    );
  }
}

/**
 * Asserts that a value has the task reminder data shape.
 * @param value - The payload data to validate.
 * @param error - An optional custom error to throw on failure.
 * @throws The custom error, or EmailTemplateError for invalid task reminder data.
 */
export function assertEmailOutboxPayloadData(
  value: unknown,
  error?: Error,
): asserts value is EmailOutboxPayloadData {
  if (!isEmailOutboxPayloadData(value)) {
    throw error ?? new EmailTemplateError('Invalid task reminder payload data');
  }
}

/**
 * Asserts that a payload has a supported template and matching data shape.
 * @param value - The payload to validate, such as a Prisma JSON value.
 * @param error - An optional custom error used for any validation failure.
 * @throws The custom error, or EmailTemplateError describing the invalid shape
 * or the template whose data failed validation.
 */
export function assertEmailPayload(
  value: unknown,
  error?: Error,
): asserts value is EmailPayload<EmailPayloadData> {
  if (!isObject(value)) {
    throw error ?? new EmailTemplateError('Invalid email payload');
  }

  assertEmailTemplate(value.template, error);

  switch (value.template) {
    case EmailTemplate.TASK_REMINDER:
      assertEmailOutboxPayloadData(value.data, error);
      return;
    case EmailTemplate.EMAIL_VERIFICATION:
      assertEmailVerificationPayloadData(value.data, error);
      return;
    default:
      throw error ?? new EmailTemplateError('Unsupported email template');
  }
}
