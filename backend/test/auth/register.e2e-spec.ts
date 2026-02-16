import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('POST /auth/register (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let throttlerStorage: ThrottlerStorageService;
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
    usersService = app.get(UsersService);
    throttlerStorage = app.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  beforeEach(async () => {
    throttlerStorage.storage.clear();

    testUser = helpers.createTestUserInput('auth-register');
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

  it('registers a new user without creating auth cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const cookies =
      (response.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(
      helpers.getCookieByName(cookies, CookieKeys.Authentication),
    ).toBeUndefined();
    expect(
      helpers.getCookieByName(cookies, CookieKeys.RefreshToken),
    ).toBeUndefined();

    const user = await usersService.findUnique({
      email: testUser.email,
    });

    expect(user).toBeDefined();
  });

  it('returns 409 for duplicate email', async () => {
    // First registration should succeed.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const user = await usersService.findUnique({
      email: testUser.email,
    });

    expect(user).toBeDefined();

    // Second registration should fail with 409 (unique constraint).
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(409);
  });

  it('returns 400 for invalid email format', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,
        email: 'invalid-email',
      })
      .expect(400);
  });

  it('returns 400 for missing password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: testUser.name,
        email: testUser.email,
      })
      .expect(400);
  });

  it('returns 400 for extra unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testUser,
        role: 'admin',
      })
      .expect(400);
  });
});
