import { Test, TestingModule } from '@nestjs/testing';

import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let emailService: {
    sendEmail: jest.Mock;
    sendEmailVerificationEmail: jest.Mock;
  };

  beforeEach(async () => {
    emailService = {
      sendEmail: jest.fn(),
      sendEmailVerificationEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
