import { Injectable } from '@nestjs/common';
import escapeHtml from 'escape-html';

import { EmailTemplateError } from '@common/errors/email-template.error';
import { EmailTemplate } from '@enums/email-template.enum';

import {
    EmailOutboxPayloadData,
    EmailPayloadData
} from './interfaces/email-payload-data.interface';
import { RenderedEmail } from './interfaces/rendered-email.interface';
import {
    getEmailVerificationHtml,
    getEmailVerificationText,
} from './templates/email-verification.template';
import {
    assertEmailOutboxPayloadData,
    assertEmailVerificationPayloadData,
} from './validators/email-payload.validator';

@Injectable()
export class EmailTemplateService {
  render(template: EmailTemplate, data: EmailPayloadData): RenderedEmail {
    switch (template) {
      case EmailTemplate.TASK_REMINDER:
        return this.renderTaskEmail(data);
      case EmailTemplate.EMAIL_VERIFICATION:
        return this.renderEmailVerification(data);
      default:
        throw new EmailTemplateError('Unsupported email template');
    }
  }

  private renderTaskEmail(data: EmailPayloadData): RenderedEmail {
    assertEmailOutboxPayloadData(data);

    const { taskTitle, taskDueDate } = data as EmailOutboxPayloadData;

    return {
      html: `<p>Task: ${escapeHtml(taskTitle)}</p>`,
      text: `Task: ${taskTitle}${taskDueDate ? `\nDue: ${taskDueDate}` : ''}`,
    };
  }

  private renderEmailVerification(data: EmailPayloadData): RenderedEmail {
    assertEmailVerificationPayloadData(data);

    return {
      html: getEmailVerificationHtml(data),
      text: getEmailVerificationText(data),
    };
  }
}
