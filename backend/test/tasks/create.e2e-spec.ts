import { TaskStatus } from '@generated/prisma';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('POST /tasks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let throttlerStorage: ThrottlerStorageService;
  let cleanupRegistry: helpers.CleanupRegistry;
  let ownerUser: helpers.TestUserInput;
  let ownerCookies: string[];

  beforeAll(async () => {
    const testApp = await helpers.createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    usersService = app.get(UsersService);
    throttlerStorage = app.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  beforeEach(async () => {
    throttlerStorage.storage.clear();

    cleanupRegistry = new helpers.CleanupRegistry();
    ownerUser = helpers.createTestUserInput('tasks-create-owner');

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, ownerUser.email);
    });

    await usersService.create(ownerUser);

    ownerCookies = await helpers.loginAndGetCookies(
      app,
      ownerUser.email,
      ownerUser.password,
    );
  });

  afterEach(async () => {
    await cleanupRegistry.run();
  });

  afterAll(async () => {
    await helpers.disconnectPrisma(prisma);
    await helpers.closeTestApp(app);
  });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'No auth task' })
      .expect(401);
  });

  it('creates a task for the authenticated user', async () => {
    const payload = {
      title: 'E2E task creation',
      description: 'Create task flow',
      status: TaskStatus.IN_PROGRESS,
    };

    const response = await request(app.getHttpServer())
      .post('/tasks')
      .set('Cookie', ownerCookies)
      .send(payload)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        title: payload.title,
        description: payload.description,
        status: payload.status,
      }),
    );

    const createdTask = await prisma.task.findFirst({
      where: {
        id: response.body.id,
        userId: response.body.userId,
      },
    });

    expect(createdTask).toBeDefined();
    expect(createdTask?.title).toBe(payload.title);
    expect(createdTask?.userId).toBe(response.body.userId);
  });

  it('returns 400 for invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Cookie', ownerCookies)
      .send({
        description: 'Missing required title',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Cookie', ownerCookies)
      .send({
        title: 'Extra field test',
        unknownField: 'not-allowed',
      })
      .expect(400);
  });
});
