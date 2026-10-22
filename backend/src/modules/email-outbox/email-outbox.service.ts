import { Injectable } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { EmailOutbox, EmailOutboxStatus, Prisma } from '@generated/prisma';

import { EntityType } from '@enums/entity.enum';
import { CreateEmailOutboxInput } from './interfaces/create-email-outbox.interface';

@Injectable()
export class EmailOutboxService {
  constructor(private prisma: PrismaService) {}

  create(
    createEmailOutboxInput: CreateEmailOutboxInput,
    transactionClient: Prisma.TransactionClient,
  ): Promise<EmailOutbox> {
    return transactionClient.emailOutbox.create({
      data: createEmailOutboxInput,
    });
  }

  /**
   * Attempts to start a delivery attempt for the specified email.
   * Increments the attempt count if successful.
   * Returns the updated attempt count or null if the email could not be claimed.
   *
   * @param emailId The ID of the email to update.
   * @param claimToken The claim token for the email.
   * @returns The updated attempt count or null if the email could not be claimed.
   */
  async startDeliveryAttempt(
    emailId: string,
    claimToken: string,
  ): Promise<number | null> {
    const results = await this.prisma.emailOutbox.updateManyAndReturn({
      where: {
        id: emailId,
        claimToken,
        status: EmailOutboxStatus.PROCESSING,
      },
      data: {
        attempts: { increment: 1 },
      },
      select: {
        attempts: true,
      },
    });

    return results[0]?.attempts ?? null;
  }

  /**
   * Marks the specified email as sent.
   * Returns true if the email was successfully updated, false otherwise.
   *
   * @param emailId The ID of the email to update.
   * @param claimToken The claim token for the email.
   * @returns True if the email was successfully updated, false otherwise.
   */
  async markAsSent(emailId: string, claimToken: string): Promise<boolean> {
    const updatedEmail = await this.prisma.emailOutbox.updateMany({
      where: {
        id: emailId,
        claimToken: claimToken,
        status: EmailOutboxStatus.PROCESSING,
      },
      data: {
        status: EmailOutboxStatus.SENT,
        sentAt: new Date(),
        lockedUntil: null,
        claimToken: null,
        lastError: null,
      },
    });

    return updatedEmail.count > 0;
  }

  /**
   * Handles a delivery failure for the specified email.
   * Updates the status to PENDING if a next attempt is scheduled, otherwise marks it as FAILED.
   * Returns true if the email was successfully updated, false otherwise.
   *
   * @param emailId The ID of the email to update.
   * @param claimToken The claim token for the email.
   * @param errorMessage The error message describing the failure.
   * @param nextAttemptAt The time for the next delivery attempt, or null if no further attempts are scheduled.
   * @returns True if the email was successfully updated, false otherwise.
   */
  async handleDeliveryFailure(
    emailId: string,
    claimToken: string,
    errorMessage: string,
    nextAttemptAt: Date | null,
  ): Promise<boolean> {
    const data: Prisma.EmailOutboxUpdateManyMutationInput = {
      status: nextAttemptAt
        ? EmailOutboxStatus.PENDING
        : EmailOutboxStatus.FAILED,
      lastError: errorMessage,
      lockedUntil: null,
      claimToken: null,
    };

    if (nextAttemptAt) {
      data.nextAttemptAt = nextAttemptAt;
    }

    const updatedEmail = await this.prisma.emailOutbox.updateMany({
      where: {
        id: emailId,
        claimToken: claimToken,
        status: EmailOutboxStatus.PROCESSING,
      },
      data,
    });

    return updatedEmail.count > 0;
  }

  async cancelForReminders(
    reminderIds: string[],
    transactionClient: Prisma.TransactionClient,
  ): Promise<number> {
    if (reminderIds.length === 0) {
      return 0;
    }

    const result = await transactionClient.emailOutbox.updateMany({
      where: {
        entityId: { in: reminderIds },
        entityType: EntityType.TASK_REMINDER,
        status: {
          in: [EmailOutboxStatus.PENDING, EmailOutboxStatus.PROCESSING],
        },
      },
      data: {
        status: EmailOutboxStatus.CANCELED,
        canceledAt: new Date(),
        claimToken: null,
        lockedUntil: null,
      },
    });

    return result.count;
  }

  /**
   * Claims a batch of emails for processing.
   * Returns the claimed emails.
   *
   * @param batchSize The number of emails to claim.
   * @param leaseDurationMinutes The duration of the lease in minutes.
   * @returns The claimed emails.
   */
  claimBatch(
    batchSize: number,
    leaseDurationMinutes: number,
  ): Promise<EmailOutbox[]> {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new Error('Batch size must be a positive integer');
    }

    if (!Number.isFinite(leaseDurationMinutes) || leaseDurationMinutes <= 0) {
      throw new Error('Lease duration must be a positive number');
    }

    return this.prisma.$queryRaw<EmailOutbox[]>`
      WITH candidates AS (  
      SELECT id
      FROM "EmailOutbox"
      WHERE
        (
          status = 'PENDING'
          AND "nextAttemptAt" <= NOW()
        )
        OR
        (
          status = 'PROCESSING'
          AND "lockedUntil" < NOW()
        )
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
      )
      UPDATE "EmailOutbox"
      SET "status" = 'PROCESSING',
          "lockedUntil" = NOW() + (${leaseDurationMinutes} * INTERVAL '1 minute'),
          "claimToken" = gen_random_uuid()
      FROM candidates
      WHERE "EmailOutbox".id = candidates.id
      RETURNING "EmailOutbox".*;
    `;
  }
}
