import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import appConfig from '@config/app.config';
import { PrismaService } from '@database/prisma.service';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';

import * as helpers from '../helpers';

describe('DELETE /auth/logout (e2e)', () => {
  let app: INestApplication<App>;
  let appConfiguration: ReturnType<typeof appConfig>;
  let prisma: PrismaService;
  let cleanupRegistry: helpers.CleanupRegistry;
  let testUser: helpers.TestUserInput;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp({
      overrides: [
        {
          provide: NotificationsService,
          useValue: {
            sendEmailNotification: jest.fn(),
            sendEmailVerificationEmail: jest.fn(),
          },
        },
      ],
    });

    app = testApp.app;
    prisma = app.get(PrismaService);
    appConfiguration = app.get(appConfig.KEY);
  });

  beforeEach(async () => {
    testUser = helpers.createTestUserInput('auth-logout');
    cleanupRegistry = new helpers.CleanupRegistry();

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, testUser.email);
    });
  });

  afterEach(async () => {
    await cleanupRegistry.run();
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  it('clears auth cookies on logout', async () => {
    const cookies = await helpers.registerAndLogin(app, testUser);
    expect(helpers.hasAuthCookies(cookies)).toBe(true);

    const logoutResponse = await request(app.getHttpServer())
      .delete('/auth/logout')
      .set('Cookie', cookies)
      .expect(200);

    const clearedCookies = logoutResponse.headers[
      'set-cookie'
    ] as unknown as string[];
    const clearedAccessCookie = helpers.getCookieByName(
      clearedCookies,
      CookieKeys.Authentication,
    );
    const clearedRefreshCookie = helpers.getCookieByName(
      clearedCookies,
      CookieKeys.RefreshToken,
    );

    expect(clearedAccessCookie).toBeDefined();
    expect(clearedRefreshCookie).toBeDefined();
    expect(clearedAccessCookie?.value).toBe('');
    expect(clearedRefreshCookie?.value).toBe('');
    expect(clearedAccessCookie?.attributes.expires).toBe(
      'Thu, 01 Jan 1970 00:00:00 GMT',
    );
    expect(clearedRefreshCookie?.attributes.expires).toBe(
      'Thu, 01 Jan 1970 00:00:00 GMT',
    );
    expect(clearedAccessCookie?.attributes.path).toBe('/');
    expect(clearedRefreshCookie?.attributes.path).toBe('/');

    if (appConfiguration.env === 'production') {
      expect(clearedAccessCookie?.attributes.secure).toBe(true);
      expect(clearedRefreshCookie?.attributes.secure).toBe(true);
    }
  });
});
