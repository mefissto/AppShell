import { TaskStatus } from '@generated/prisma';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { UsersService } from '@modules/users/users.service';

import * as helpers from '../helpers';

describe('DELETE /tasks/:id (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let usersService: UsersService;
  let throttlerStorage: ThrottlerStorageService;
  let cleanupRegistry: helpers.CleanupRegistry;

  let ownerUser: helpers.TestUserInput;
  let otherUser: helpers.TestUserInput;
  let ownerCookies: string[];
  let otherCookies: string[];
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
    ownerUser = helpers.createTestUserInput('tasks-delete-owner');
    otherUser = helpers.createTestUserInput('tasks-delete-other');

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, ownerUser.email);
    });

    cleanupRegistry.register(async () => {
      await helpers.cleanupUserByEmail(prisma, otherUser.email);
    });

    await usersService.create(ownerUser);
    await usersService.create(otherUser);

    ownerId = (await usersService.findUnique({ email: ownerUser.email }))!.id;

    ownerCookies = await helpers.loginAndGetCookies(
      app,
      ownerUser.email,
      ownerUser.password,
    );

    otherCookies = await helpers.loginAndGetCookies(
      app,
      otherUser.email,
      otherUser.password,
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
    await request(app.getHttpServer()).delete('/tasks/some-id').expect(401);
  });

  it('deletes a task for the owner', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Task to delete',
        status: TaskStatus.PENDING,
        userId: ownerId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set('Cookie', ownerCookies)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/tasks/${task.id}`)
      .set('Cookie', ownerCookies)
      .expect(404);
  });

  it('returns 404 when deleting another user task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Private task',
        status: TaskStatus.PENDING,
        userId: ownerId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/tasks/${task.id}`)
      .set('Cookie', otherCookies)
      .expect(404);
  });
});
