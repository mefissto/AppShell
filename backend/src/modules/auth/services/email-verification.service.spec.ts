import { EmailSenderService } from '@modules/email/email-sender.service';
import { EmailTemplateService } from '@modules/email/email-template.service';

import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  it('renders verification data and sends through the shared sender', async () => {
    // Arrange
    const send: jest.MockedFunction<EmailSenderService['send']> = jest
      .fn()
      .mockResolvedValue({ id: 'delivery' });
    const service = new EmailVerificationService(new EmailTemplateService(), {
      send,
    } as unknown as EmailSenderService);
    const recipient = 'user@example.test';
    const data = {
      userName: 'User',
      verificationLink: 'https://example.test/verify',
    };

    // Act
    const result = await service.sendEmailVerificationEmail(recipient, data);

    // Assert
    expect(result).toEqual({ id: 'delivery' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      to: recipient,
      subject: 'Verify your email address',
      html: expect.stringContaining(data.verificationLink) as string,
      text: expect.stringContaining('Hi User,') as string,
    });
  });
});
