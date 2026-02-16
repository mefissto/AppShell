import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;
  let prisma: PrismaService;
  let cleanupRegistry: helpers.CleanupRegistry;
  let testUser: helpers.TestUserInput;

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    usersService = app.get(UsersService);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    testUser = helpers.createTestUserInput('auth-login');
    cleanupRegistry = new helpers.CleanupRegistry();

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, testUser.email);
    });

    // Create a real user so LocalAuthGuard can validate credentials for the login test.
    await usersService.create(testUser);
  });

  afterEach(async () => {
    await cleanupRegistry.run();
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  it('returns auth cookies for valid credentials', async () => {
    const cookies = await helpers.loginAndGetCookies(
      app,
      testUser.email,
      testUser.password,
    );

    expect(helpers.hasAuthCookies(cookies)).toBe(true);
  });

  it('returns 401 for invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongP@ssw0rd!' })
      .expect(401);
  });

  it('returns 401 for missing password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email })
      .expect(401);
  });

  it('returns 401 for missing email', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: testUser.password })
      .expect(401);
  });
});
