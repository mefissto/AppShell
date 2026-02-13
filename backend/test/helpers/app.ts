import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';

import { AppModule } from '../../src/app.module';

export type TestApp = {
  app: INestApplication<App>;
  moduleRef: TestingModule;
};

export const createTestApp = async (): Promise<TestApp> => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return { app, moduleRef };
};

export const closeTestApp = async (
  app: INestApplication<App>,
): Promise<void> => {
  await app.close();
};
