import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';

import * as helpers from '../helpers';

describe('POST /auth/refresh (e2e)', () => {
  let app: INestApplication<App>;
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
  });

  beforeEach(async () => {
    testUser = helpers.createTestUserInput('auth-refresh');
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

  it('returns 401 if no refresh token cookie is provided', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('returns new auth cookies for valid refresh token', async () => {
    const cookies = await helpers.registerAndLogin(app, testUser);
    expect(helpers.hasAuthCookies(cookies)).toBe(true);

    const refreshTokenCookie = cookies.find((cookie: string) =>
      cookie.startsWith(`${CookieKeys.RefreshToken}=`),
    );
    expect(refreshTokenCookie).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshTokenCookie!)
      .expect(200);

    const newCookies = refreshResponse.headers[
      'set-cookie'
    ] as unknown as string[];

    expect(helpers.hasAuthCookies(newCookies)).toBe(true);

    const accessCookie = helpers.getCookieByName(
      newCookies,
      CookieKeys.Authentication,
    );
    const rotatedRefreshCookie = helpers.getCookieByName(
      newCookies,
      CookieKeys.RefreshToken,
    );

    expect(accessCookie).toBeDefined();
    expect(rotatedRefreshCookie).toBeDefined();
    expect(accessCookie?.value).toBeTruthy();
    expect(rotatedRefreshCookie?.value).toBeTruthy();
    expect(accessCookie?.attributes.httponly).toBe(true);
    expect(rotatedRefreshCookie?.attributes.httponly).toBe(true);
    expect(accessCookie?.attributes.path).toBe('/');
    expect(rotatedRefreshCookie?.attributes.path).toBe('/');
    expect(accessCookie?.attributes.samesite).toBe('Strict');
    expect(rotatedRefreshCookie?.attributes.samesite).toBe('Strict');

    if (process.env.NODE_ENV === 'production') {
      expect(accessCookie?.attributes.secure).toBe(true);
      expect(rotatedRefreshCookie?.attributes.secure).toBe(true);
    } else {
      expect(accessCookie?.attributes.secure).toBeUndefined();
      expect(rotatedRefreshCookie?.attributes.secure).toBeUndefined();
    }
  });

  it('returns 401 for invalid refresh token', async () => {
    const invalidRefreshTokenCookie = `${CookieKeys.RefreshToken}=invalidtoken; Path=/; HttpOnly`;

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', invalidRefreshTokenCookie)
      .expect(401);
  });

  it('rotates refresh token value after refresh', async () => {
    const initialCookies = await helpers.registerAndLogin(app, testUser);
    const initialRefreshCookieHeader = initialCookies.find((cookie: string) =>
      cookie.startsWith(`${CookieKeys.RefreshToken}=`),
    );
    const initialRefreshCookie = helpers.getCookieByName(
      initialCookies,
      CookieKeys.RefreshToken,
    );

    expect(initialRefreshCookieHeader).toBeDefined();
    expect(initialRefreshCookie).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', initialRefreshCookieHeader!)
      .expect(200);

    const rotatedCookies = refreshResponse.headers[
      'set-cookie'
    ] as unknown as string[];
    const rotatedRefreshCookie = helpers.getCookieByName(
      rotatedCookies,
      CookieKeys.RefreshToken,
    );

    expect(rotatedRefreshCookie).toBeDefined();
    expect(rotatedRefreshCookie?.value).not.toBe(initialRefreshCookie?.value);
  });
});
