import { Test, TestingModule } from '@nestjs/testing';

import notificationsConfig from '@config/notifications.config';

import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const mockNotificationConfig = {
      resend: {
        apiKey: 'test-api-key',
      },
      email: {
        from: 'test@example.com',
        fromName: 'Test Name',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: notificationsConfig.KEY, useValue: mockNotificationConfig },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
