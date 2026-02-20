import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';

import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: { notification: { create: jest.Mock } };
  let emailService: {
    sendEmail: jest.Mock;
    sendEmailVerificationEmail: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      notification: {
        create: jest.fn(),
      },
    };

    emailService = {
      sendEmail: jest.fn(),
      sendEmailVerificationEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
