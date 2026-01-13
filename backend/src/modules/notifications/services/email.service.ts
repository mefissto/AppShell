import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { CreateEmailResponseSuccess, Resend } from 'resend';

import notificationsConfig from '@config/notifications.config';

import { EmailVerificationPayload } from '../interfaces/email-verification.interface';
import { EmailPayload } from '../interfaces/send-email.interface';
import {
  getEmailVerificationHtml,
  getEmailVerificationText,
} from '../templates/email-verification.template';

@Injectable()
export class EmailService {
  private resendClient: Resend;

  constructor(
    @Inject(notificationsConfig.KEY)
    private config: ConfigType<typeof notificationsConfig>,
  ) {
    this.resendClient = new Resend(config.resend.apiKey);
  }

  async sendEmail(payload: EmailPayload): Promise<CreateEmailResponseSuccess> {
    if (!payload.html && !payload.text) {
      throw new InternalServerErrorException(
        'Email text or HTML is required for sending emails.',
      );
    }

    const { data, error } = await this.resendClient.emails.send({
      from: `${this.config.email.fromName} <${this.config.email.from}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }

    return data;
  }

  async sendEmailVerificationEmail(
    payload: EmailPayload<EmailVerificationPayload, void>,
  ): Promise<CreateEmailResponseSuccess> {
    const { data, error } = await this.resendClient.emails.send({
      from: `${this.config.email.fromName} <${this.config.email.from}>`,
      to: payload.to,
      subject: 'Verify your email address',
      html: getEmailVerificationHtml(payload.data),
      text: getEmailVerificationText(payload.data),
    });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to send verification email: ${error.message}`,
      );
    }

    return data;
  }
}
