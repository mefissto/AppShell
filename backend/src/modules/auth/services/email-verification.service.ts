import { Injectable } from '@nestjs/common';

import { EmailTemplate } from '@enums/email-template.enum';
import { EmailSenderService } from '@modules/email/email-sender.service';
import { EmailTemplateService } from '@modules/email/email-template.service';
import { EmailVerificationPayloadData } from '@modules/email/interfaces/email-payload-data.interface';
import { SendEmailInput } from '@modules/email/interfaces/send-email-input.interface';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailSenderService: EmailSenderService,
  ) {}

  sendEmailVerificationEmail(
    email: string,
    data: EmailVerificationPayloadData,
  ): ReturnType<typeof this.emailSenderService.send> {
    const template = this.emailTemplateService.render(
      EmailTemplate.EMAIL_VERIFICATION,
      data,
    );
    const sendEmailInput: SendEmailInput = {
      to: email,
      subject: 'Verify your email address',
      ...template,
    };

    return this.emailSenderService.send(sendEmailInput);
  }
}
