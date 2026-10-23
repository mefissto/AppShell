import { EmailDeliveryError } from '@common/errors/email-delivery.error';
import { EmailTemplateError } from '@common/errors/email-template.error';
import { EmailTemplate } from '@enums/email-template.enum';
import { EmailOutbox, EmailOutboxStatus } from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import { EmailSenderService } from '@modules/email/email-sender.service';
import { EmailTemplateService } from '@modules/email/email-template.service';
import {
  EMAIL_OUTBOX_BATCH_SIZE,
  EMAIL_OUTBOX_LOCK_DURATION_MINUTES,
  EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
  EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS,
} from './constants/email-outbox.const';
import { EmailOutboxService } from './email-outbox.service';
import { EmailOutboxWorker } from './email-outbox.worker';

describe('EmailOutboxWorker', () => {
  let outbox: jest.Mocked<
    Pick<
      EmailOutboxService,
      | 'claimBatch'
      | 'startDeliveryAttempt'
      | 'markAsSent'
      | 'handleDeliveryFailure'
    >
  >;
  let send: jest.MockedFunction<EmailSenderService['send']>;
  let templates: EmailTemplateService;
  let worker: EmailOutboxWorker;
  let email: EmailOutbox;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T10:00:00Z'));
    email = {
      id: 'email-1',
      to: 'recipient@example.test',
      subject: 'Reminder',
      payload: {
        template: EmailTemplate.TASK_REMINDER,
        data: { taskTitle: 'Task & title', taskDueDate: null },
      },
      status: EmailOutboxStatus.PROCESSING,
      attempts: 0,
      claimToken: 'claim-1',
      lockedUntil: new Date(Date.now() + 300000),
      nextAttemptAt: new Date(),
      sentAt: null,
      canceledAt: null,
      entityId: null,
      entityType: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    outbox = {
      claimBatch: jest.fn().mockResolvedValue([email]),
      startDeliveryAttempt: jest.fn().mockResolvedValue(1),
      markAsSent: jest.fn().mockResolvedValue(true),
      handleDeliveryFailure: jest.fn().mockResolvedValue(true),
    };
    send = jest.fn().mockResolvedValue({ id: 'sent' });
    templates = new EmailTemplateService();
    worker = new EmailOutboxWorker(
      outbox as unknown as EmailOutboxService,
      templates,
      { send } as unknown as EmailSenderService,
      {
        setContext: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as unknown as LoggerService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('claims the configured batch and delivers the rendered message once', async () => {
    // Act
    await worker.processBatch();

    // Assert
    expect(outbox.claimBatch).toHaveBeenCalledWith(
      EMAIL_OUTBOX_BATCH_SIZE,
      EMAIL_OUTBOX_LOCK_DURATION_MINUTES,
    );
    expect(outbox.startDeliveryAttempt).toHaveBeenCalledWith(
      email.id,
      email.claimToken,
      EMAIL_OUTBOX_LOCK_DURATION_MILLIS,
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      {
        to: email.to,
        subject: email.subject,
        html: '<p>Task: Task &amp; title</p>',
        text: 'Task: Task & title',
      },
      'EMAIL_OUTBOX/email-1',
    );
    expect(outbox.markAsSent).toHaveBeenCalledWith(email.id, email.claimToken);
    expect(outbox.handleDeliveryFailure).not.toHaveBeenCalled();
  });

  it('reuses the idempotency key after a retry with a new claim token', async () => {
    send.mockRejectedValueOnce(
      new EmailDeliveryError('Unavailable', undefined, true),
    );
    await worker.processBatch();
    email.claimToken = 'claim-retry';
    email.attempts = 1;
    outbox.startDeliveryAttempt.mockResolvedValue(2);
    await worker.processBatch();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((call) => call[1])).toEqual([
      'EMAIL_OUTBOX/email-1',
      'EMAIL_OUTBOX/email-1',
    ]);
    expect(outbox.markAsSent).toHaveBeenCalledWith(email.id, 'claim-retry');
  });

  it.each([
    {},
    [],
    { template: 'UNKNOWN', data: {} },
    { template: EmailTemplate.TASK_REMINDER, data: {} },
    { template: EmailTemplate.EMAIL_VERIFICATION, data: { userName: 'Name' } },
  ])(
    'permanently fails invalid payload %j without delivery attempts',
    async (payload) => {
      // Arrange
      email.payload = payload;

      // Act
      await worker.processBatch();

      // Assert
      expect(outbox.handleDeliveryFailure).toHaveBeenCalledWith(
        email.id,
        email.claimToken,
        'Invalid email payload',
        null,
      );
      expect(outbox.startDeliveryAttempt).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('fails rendering errors without incrementing attempts', async () => {
    // Arrange: inject a rendering error after the payload envelope passes validation.
    jest.spyOn(templates, 'render').mockImplementation(() => {
      throw new EmailTemplateError('Cannot render');
    });

    // Act
    await worker.processBatch();

    // Assert
    expect(outbox.handleDeliveryFailure).toHaveBeenCalledWith(
      email.id,
      email.claimToken,
      'Cannot render',
      null,
    );
    expect(outbox.startDeliveryAttempt).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    { attempt: 1, retryDelayMinutes: 1 },
    { attempt: 2, retryDelayMinutes: 2 },
    { attempt: 3, retryDelayMinutes: 4 },
    { attempt: 4, retryDelayMinutes: 8 },
    { attempt: 5, retryDelayMinutes: null },
  ])(
    'applies retry delay $retryDelayMinutes after delivery attempt $attempt',
    async ({ attempt, retryDelayMinutes }) => {
      // Arrange: claiming preserves attempts; starting delivery increments them once.
      email.attempts = attempt - 1;
      outbox.startDeliveryAttempt.mockResolvedValue(attempt);
      send.mockRejectedValue(
        new EmailDeliveryError('Unavailable', undefined, true),
      );

      // Act
      await worker.processBatch();

      // Assert
      expect(outbox.handleDeliveryFailure).toHaveBeenCalledWith(
        email.id,
        email.claimToken,
        'Unavailable',
        retryDelayMinutes === null
          ? null
          : new Date(Date.now() + retryDelayMinutes * 60000),
      );
      expect(outbox.startDeliveryAttempt).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledTimes(1);
      expect(outbox.markAsSent).not.toHaveBeenCalled();
    },
  );

  it('does not retry permanent provider errors', async () => {
    // Arrange
    send.mockRejectedValue(
      new EmailDeliveryError('Rejected', undefined, false),
    );

    // Act
    await worker.processBatch();

    // Assert
    expect(outbox.handleDeliveryFailure).toHaveBeenCalledWith(
      email.id,
      email.claimToken,
      'Rejected',
      null,
    );
  });

  it('fails exhausted records without starting delivery', async () => {
    // Arrange
    email.attempts = EMAIL_OUTBOX_RETRY_MAX_ATTEMPTS;

    // Act
    await worker.processBatch();

    // Assert
    expect(outbox.handleDeliveryFailure).toHaveBeenCalledWith(
      email.id,
      email.claimToken,
      'Maximum delivery attempts reached',
      null,
    );
    expect(outbox.startDeliveryAttempt).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('does not send after losing ownership before delivery', async () => {
    // Arrange: a rejected conditional update means another worker owns the record.
    outbox.startDeliveryAttempt.mockResolvedValue(null);

    // Act
    await worker.processBatch();

    // Assert
    expect(send).not.toHaveBeenCalled();
    expect(outbox.markAsSent).not.toHaveBeenCalled();
    expect(outbox.handleDeliveryFailure).not.toHaveBeenCalled();
  });

  it('does not force state updates after losing ownership during delivery', async () => {
    // Arrange: ownership changed while the provider request was in flight.
    outbox.markAsSent.mockResolvedValue(false);

    // Act
    await worker.processBatch();

    // Assert
    expect(send).toHaveBeenCalledTimes(1);
    expect(outbox.markAsSent).toHaveBeenCalledWith(email.id, email.claimToken);
    expect(outbox.markAsSent).toHaveBeenCalledTimes(1);
    expect(outbox.handleDeliveryFailure).not.toHaveBeenCalled();
  });

  it.each(['startDeliveryAttempt', 'markAsSent'] as const)(
    'does not classify %s database failures as provider failures and continues',
    async (operation) => {
      // Arrange: only the first record fails; the next record must still be processed.
      outbox[operation].mockRejectedValueOnce(
        new Error('Database unavailable'),
      );
      outbox.claimBatch.mockResolvedValue([
        email,
        { ...email, id: 'email-2', claimToken: 'claim-2' },
      ]);

      // Act
      await worker.processBatch();

      // Assert
      expect(outbox.handleDeliveryFailure).not.toHaveBeenCalled();
      expect(outbox.markAsSent).toHaveBeenCalledWith('email-2', 'claim-2');
    },
  );

  it('continues after a provider failure', async () => {
    // Arrange: the provider rejects the first email and accepts the second.
    outbox.claimBatch.mockResolvedValue([
      email,
      { ...email, id: 'email-2', claimToken: 'claim-2' },
    ]);
    send.mockRejectedValueOnce(
      new EmailDeliveryError('Rejected', undefined, false),
    );

    // Act
    await worker.processBatch();

    // Assert
    expect(send).toHaveBeenCalledTimes(2);
    expect(outbox.markAsSent).toHaveBeenCalledWith('email-2', 'claim-2');
  });

  it('propagates claim database failures', async () => {
    // Arrange
    outbox.claimBatch.mockRejectedValue(new Error('Database unavailable'));

    // Act
    const processing = worker.processBatch();

    // Assert
    await expect(processing).rejects.toThrow('Database unavailable');
    expect(send).not.toHaveBeenCalled();
  });
});
