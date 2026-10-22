import { EmailOutbox } from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import { EmailSenderService } from '@modules/email/email-sender.service';
import { EmailTemplateService } from '@modules/email/email-template.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { EmailDeliveryError } from '@common/errors/email-delivery.error';
import { EmailTemplateError } from '@common/errors/email-template.error';
import { isEmailPayload } from '@modules/email/validators/email-payload.validator';
import { castExists } from '@utils/asserts.utils';
import { exponentialDelay } from '@utils/exponential-delay';
import {
  EMAIL_OUTBOX_BATCH_SIZE,
  EMAIL_OUTBOX_CLAIM_INTERVAL_MINUTES,
  EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS,
} from './constants/email-outbox.const';
import { EmailOutboxService } from './email-outbox.service';

@Injectable()
export class EmailOutboxWorker {
  constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailSenderService: EmailSenderService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailOutboxWorker.name);
  }

  async processBatch() {
    const claimedBatch = await this.emailOutboxService.claimBatch(
      EMAIL_OUTBOX_BATCH_SIZE,
      EMAIL_OUTBOX_CLAIM_INTERVAL_MINUTES,
    );

    for (const email of claimedBatch) {
      try {
        await this.processEmail(email);
      } catch (error) {
        this.logger.error(
          `Failed to process email ${email.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async processEmail(email: EmailOutbox): Promise<void> {
    let attempts: number | null = null;

    if (!email.claimToken) {
      throw new InternalServerErrorException(
        `Email ${email.id} does not have a claim token`,
      );
    }

    if (email.attempts >= EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS) {
      await this.emailOutboxService.handleDeliveryFailure(
        email.id,
        email.claimToken,
        'Maximum delivery attempts reached',
        null,
      );
      this.logger.warn(
        `Email ${email.id} has reached the maximum number of delivery attempts`,
      );
      return;
    }

    try {
      if (!isEmailPayload(email.payload)) {
        await this.emailOutboxService.handleDeliveryFailure(
          email.id,
          email.claimToken,
          `Invalid email payload`,
          null,
        );

        return;
      }

      const template = await this.emailTemplateService.render(
        email.payload.template,
        email.payload.data,
      );

      attempts = await this.emailOutboxService.startDeliveryAttempt(
        email.id,
        email.claimToken,
      );

      if (!attempts) {
        this.logger.warn(
          `Failed to start delivery attempt for email ${email.id}`,
        );
        return;
      }

      await this.emailSenderService.send({
        to: email.to,
        subject: email.subject,
        ...template,
      });
      const isMarkedAsSent = await this.emailOutboxService.markAsSent(
        email.id,
        email.claimToken,
      );
      if (!isMarkedAsSent) {
        this.logger.warn(`Failed to mark email ${email.id} as sent`);
      }
    } catch (error) {
      await this.handleEmailProcessingFailure(error, email, attempts);
    }
  }

  private async handleEmailProcessingFailure(
    error: unknown,
    email: EmailOutbox,
    attempts: number | null,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const claimToken = castExists(
      email.claimToken,
      `Email ${email.id} does not have a claim token`,
    );

    if (error instanceof EmailTemplateError) {
      await this.emailOutboxService.handleDeliveryFailure(
        email.id,
        claimToken,
        errorMessage,
        null,
      );
      this.logger.error(
        `Failed to process email ${email.id} due to template error: ${errorMessage}`,
        error instanceof Error ? error.stack : String(error),
      );
    } else if (error instanceof EmailDeliveryError) {
      const nextAttemptAt = error.retryable
        ? this.calculateNextAttemptAt(attempts)
        : null;
      await this.emailOutboxService.handleDeliveryFailure(
        email.id,
        claimToken,
        errorMessage,
        nextAttemptAt,
      );
      this.logger.error(
        `Failed to process email ${email.id} due to delivery error: ${errorMessage}`,
        error instanceof Error ? error.stack : String(error),
      );
    } else {
      this.logger.error(
        `Failed to process email ${email.id} due to unknown error: ${errorMessage}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private calculateNextAttemptAt(attempts: number | null): Date | null {
    const nextAttemptDelayInMinutes =
      attempts === null || attempts >= EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS
        ? null
        : exponentialDelay(attempts);

    return nextAttemptDelayInMinutes === null
      ? null
      : new Date(new Date().getTime() + nextAttemptDelayInMinutes * 60 * 1000);
  }
}
