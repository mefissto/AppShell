import { EmailTemplate } from '@enums/email-template.enum';

export interface EmailVerificationPayloadData {
  userName: string;
  verificationLink: string;
}

export interface EmailOutboxPayloadData {
  taskTitle: string;
  taskDueDate: string | null;
}

export interface EmailPayload<T = Record<string, any>> {
  template: EmailTemplate;
  data: T;
}

export type EmailPayloadData =
  | EmailVerificationPayloadData
  | EmailOutboxPayloadData;
