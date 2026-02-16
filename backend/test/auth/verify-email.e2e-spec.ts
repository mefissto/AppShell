import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { HashingService } from '@modules/security/services/hashing.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('POST /auth/verify-email (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;
  let hashingService: HashingService;
  let prisma: PrismaService;
  let throttlerStorage: ThrottlerStorageService;
  let cleanupRegistry: helpers.CleanupRegistry;
  let testUser: helpers.TestUserInput;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    usersService = app.get(UsersService);
    hashingService = app.get(HashingService);
    prisma = app.get(PrismaService);
    throttlerStorage = app.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  beforeEach(async () => {
    // Clear throttler storage to prevent rate limit issues during tests
    throttlerStorage.storage.clear();

    testUser = helpers.createTestUserInput('auth-verify-email');
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

  it('returns 400 if user does not exist', async () => {
    const verifyEmailDto = {
      email: 'nonexistent@example.com',
      token: '12345678901234567890123456789012',
    };

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(400);
  });

  it('returns 400 for invalid email format', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({
        email: 'not-an-email',
        token: '12345678901234567890123456789012',
      })
      .expect(400);
  });

  it('returns 400 for token shorter than minimum length', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({
        email: testUser.email,
        token: 'too-short-token',
      })
      .expect(400);
  });

  it('returns 400 for unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({
        email: testUser.email,
        token: '12345678901234567890123456789012',
        extra: 'not-allowed',
      })
      .expect(400);
  });

  it('returns 400 if token is invalid', async () => {
    const emailVerificationToken = hashingService.generateRandomHash();
    const emailVerificationTokenExpiresAt = new Date(
      new Date().getTime() + 60 * 60 * 1000, // 1 hour from now
    );
    const verifyEmailDto = {
      email: testUser.email,
      token: 'wrong@token!',
    };

    await usersService.create(testUser, {
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
    });

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(400);
  });

  it('returns 400 if token is expired', async () => {
    const emailVerificationToken = hashingService.generateRandomHash();
    const emailVerificationTokenExpiresAt = new Date(
      new Date().getTime() - 60 * 60 * 1000, // 1 hour ago
    );
    const verifyEmailDto = {
      email: testUser.email,
      token: emailVerificationToken,
    };

    await usersService.create(testUser, {
      emailVerificationToken: await hashingService.hash(emailVerificationToken),
      emailVerificationTokenExpiresAt,
    });

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(400);
  });

  it('returns 200 and verifies email with valid token', async () => {
    const emailVerificationToken = hashingService.generateRandomHash();
    const emailVerificationTokenExpiresAt = new Date(
      new Date().getTime() + 60 * 60 * 1000, // 1 hour from now
    );
    const verifyEmailDto = {
      email: testUser.email,
      token: emailVerificationToken,
    };

    await usersService.create(testUser, {
      emailVerificationToken: await hashingService.hash(emailVerificationToken),
      emailVerificationTokenExpiresAt,
    });

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send(verifyEmailDto)
      .expect(200);

    const updatedUser = await usersService.findUnique({
      email: testUser.email,
    });

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.emailVerificationToken).toBeUndefined();
    expect(updatedUser?.emailVerificationTokenExpiresAt).toBeUndefined();
  });
});
