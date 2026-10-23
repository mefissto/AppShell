import { Resend } from 'resend';

import { EmailDeliveryError } from '@common/errors/email-delivery.error';

import { EmailSenderService } from './email-sender.service';

jest.mock('resend', () => ({ Resend: jest.fn() }));

describe('EmailSenderService', () => {
  let send: jest.Mock;
  let service: EmailSenderService;
  const input = {
    to: 'recipient@example.test',
    subject: 'Subject',
    html: '<p>Hello</p>',
    text: 'Hello',
  };

  beforeEach(() => {
    jest.mocked(Resend).mockReset();
    send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'delivery-id' }, error: null });
    jest
      .mocked(Resend)
      .mockImplementation(() => ({ emails: { send } }) as unknown as Resend);
    service = new EmailSenderService({
      resend: { apiKey: 'test-key' },
      email: { fromName: 'AppShell', from: 'sender@example.test' },
    });
  });

  it('passes all message fields to Resend and resolves with the delivery', async () => {
    // Act
    const result = await service.send(input);

    // Assert
    expect(result).toEqual({ id: 'delivery-id' });
    expect(Resend).toHaveBeenCalledTimes(1);
    expect(Resend).toHaveBeenCalledWith('test-key');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      {
        ...input,
        from: 'AppShell <sender@example.test>',
      },
      undefined,
    );
  });

  it('passes the idempotency key to Resend as request options', async () => {
    await expect(service.send(input, 'EMAIL_OUTBOX/email-1')).resolves.toEqual({
      id: 'delivery-id',
    });
    expect(send).toHaveBeenCalledWith(
      { ...input, from: 'AppShell <sender@example.test>' },
      { idempotencyKey: 'EMAIL_OUTBOX/email-1' },
    );
  });

  describe.each(['returned', 'thrown'])('%s SDK errors', (mode) => {
    it.each([
      [429, true],
      [500, true],
      [503, true],
      [599, true],
      [400, false],
      [401, false],
      [422, false],
    ])(
      'classifies HTTP %i as retryable=%s and preserves cause',
      async (statusCode, retryable) => {
        // Arrange
        const cause = {
          statusCode,
          message: 'Provider detail',
          name: 'provider_error',
        };
        // Resend can return an error envelope or reject the SDK promise.
        if (mode === 'returned') {
          send.mockResolvedValue({ data: null, error: cause });
        } else {
          send.mockRejectedValue(cause);
        }

        // Act
        const delivery = service.send(input);

        // Assert
        await expect(delivery).rejects.toMatchObject({
          name: 'EmailDeliveryError',
          retryable,
          cause,
          message: expect.stringContaining(cause.message) as string,
        });
      },
    );
  });

  it.each(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'unknown'])(
    'retries errors without status including %s',
    async (code) => {
      // Arrange
      const cause = Object.assign(new Error('Network failed'), { code });
      send.mockRejectedValue(cause);

      // Act
      const result = service.send(input);

      // Assert
      await expect(result).rejects.toBeInstanceOf(EmailDeliveryError);
      await expect(result).rejects.toMatchObject({ retryable: true, cause });
    },
  );

  it('preserves unexpected status errors unchanged', async () => {
    // Arrange
    const cause = { statusCode: 302, message: 'Unexpected response' };
    send.mockRejectedValue(cause);

    // Act
    const delivery = service.send(input);

    // Assert
    await expect(delivery).rejects.toBe(cause);
  });
});
