import { TaskStatus } from '@generated/prisma';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('GET /tasks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let throttlerStorage: ThrottlerStorageService;
  let cleanupRegistry: helpers.CleanupRegistry;

  let ownerUser: helpers.TestUserInput;
  let ownerCookies: string[];
  let ownerId: string;

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
    ownerUser = helpers.createTestUserInput('tasks-list-owner');

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, ownerUser.email);
    });

    await usersService.create(ownerUser);

    ownerId = (await usersService.findUnique({ email: ownerUser.email }))!.id;

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
    await request(app.getHttpServer()).get('/tasks').expect(401);
  });

  it('lists tasks with pagination metadata', async () => {
    const titleSuffix = helpers.createUniqueSuffix('tasks-list');

    const [taskOne, taskTwo] = await Promise.all([
      prisma.task.create({
        data: {
          title: `Owner task 1 ${titleSuffix}`,
          description: 'Owner data',
          status: TaskStatus.PENDING,
          userId: ownerId,
        },
      }),
      prisma.task.create({
        data: {
          title: `Owner task 2 ${titleSuffix}`,
          description: 'Owner data',
          status: TaskStatus.COMPLETED,
          userId: ownerId,
        },
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get('/tasks')
      .set('Cookie', ownerCookies)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);

    const returnedTaskIds = response.body.data.map(
      (task: { id: string }) => task.id,
    );

    expect(returnedTaskIds).toEqual(
      expect.arrayContaining([taskOne.id, taskTwo.id]),
    );

    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 10,
      }),
    );

    expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
  });
});
