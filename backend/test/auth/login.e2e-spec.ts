import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '../../src/database/prisma.service';
import { UsersService } from '../../src/modules/users/users.service';
import {
    cleanupUserByEmail,
    closeTestApp,
    createTestApp,
    disconnectPrisma,
    hasAuthCookies,
    loginAndGetCookies,
} from '../helpers';

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication<App>;
  let usersService: UsersService;
  let prisma: PrismaService;

  const testUser = {
    name: 'E2E User',
    email: 'e2e.user@example.com',
    password: 'StrongP@ssw0rd!',
  };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    usersService = app.get(UsersService);
    prisma = app.get(PrismaService);

    // Create a real user so LocalAuthGuard can validate credentials for the login test.
    await cleanupUserByEmail(prisma, testUser.email);
    await usersService.create(testUser);
  });

  afterAll(async () => {
    // Clean up test data to keep the DB deterministic across runs.
    await cleanupUserByEmail(prisma, testUser.email);
    await disconnectPrisma(prisma);
    await closeTestApp(app);
  });

  it('returns auth cookies for valid credentials', async () => {
    const cookies = await loginAndGetCookies(
      app,
      testUser.email,
      testUser.password,
    );

    expect(hasAuthCookies(cookies)).toBe(true);
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
