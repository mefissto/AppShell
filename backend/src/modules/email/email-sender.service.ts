import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import {
  CreateEmailRequestOptions,
  CreateEmailResponseSuccess,
  ErrorResponse,
  Resend,
} from 'resend';

import { EmailDeliveryError } from '@common/errors/email-delivery.error';
import notificationsConfig from '@config/notifications.config';

import { SendEmailInput } from './interfaces/send-email-input.interface';

@Injectable()
export class EmailSenderService {
  private resendClient: Resend;

  constructor(
    @Inject(notificationsConfig.KEY)
    private config: ConfigType<typeof notificationsConfig>,
  ) {
    this.resendClient = new Resend(config.resend.apiKey);
  }

  async send(
    input: SendEmailInput,
    idempotencyKey?: string,
  ): Promise<CreateEmailResponseSuccess> {
    const requestOptions: CreateEmailRequestOptions | undefined = idempotencyKey
      ? { idempotencyKey }
      : undefined;

    try {
      const { error, data } = await this.resendClient.emails.send(
        {
          from: `${this.config.email.fromName} <${this.config.email.from}>`,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        },
        requestOptions,
      );

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: ErrorResponse | unknown): never {
    const statusCode = (error as ErrorResponse)?.statusCode;
    const message = (error as ErrorResponse)?.message ?? error;

    if (!statusCode) {
      throw new EmailDeliveryError(
        `Failed to send email: Unknown error - ${message}`,
        error,
        true,
      );
    } else if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      throw new EmailDeliveryError(
        `Failed to send email: Too many requests - ${message}`,
        error,
        true,
      );
    } else if (statusCode >= 500 && statusCode < 600) {
      throw new EmailDeliveryError(
        `Failed to send email: Email server error - ${message}`,
        error,
        true,
      );
    } else if (statusCode >= 400 && statusCode < 500) {
      throw new EmailDeliveryError(
        `Failed to send email: Client error - ${message}`,
        error,
        false,
      );
    }

    throw error;
  }
}
