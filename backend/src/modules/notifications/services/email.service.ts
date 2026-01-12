import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { CreateEmailResponseSuccess, Resend } from 'resend';

import notificationsConfig from '@config/notifications.config';

@Injectable()
export class EmailService {
  private resendClient: Resend;

  constructor(
    @Inject(notificationsConfig.KEY)
    private config: ConfigType<typeof notificationsConfig>,
  ) {
    this.resendClient = new Resend(config.resend.apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<CreateEmailResponseSuccess> {
    const { data, error } = await this.resendClient.emails.send({
      from: `${this.config.email.fromName} <${this.config.email.from}>`,
      to,
      subject,
      text: body,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }

    return data;
  }
}
