import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';

import { AppModule } from '../../src/app.module';
import { PrismaExceptionFilter } from '../../src/common/filters/prisma-exception.filter';
import { LoggerService } from '../../src/common/logger/logger.service';

export type TestApp = {
  app: INestApplication<App>;
  moduleRef: TestingModule;
};

type ProviderOverride = {
  provide: unknown;
  useValue?: unknown;
  useClass?: new (...args: never[]) => unknown;
  useFactory?: (...args: never[]) => unknown;
  inject?: unknown[];
};

type CreateTestAppOptions = {
  overrides?: ProviderOverride[];
};

export const createTestApp = async (
  options: CreateTestAppOptions = {},
): Promise<TestApp> => {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (options.overrides) {
    for (const override of options.overrides) {
      const overrideBuilder = builder.overrideProvider(override.provide);

      if (override.useValue !== undefined) {
        overrideBuilder.useValue(override.useValue);
      } else if (override.useClass !== undefined) {
        overrideBuilder.useClass(override.useClass);
      } else if (override.useFactory !== undefined) {
        overrideBuilder.useFactory({
          factory: override.useFactory,
          inject: override.inject || [],
        });
      }
    }
  }

  const moduleRef: TestingModule = await builder.compile();

  const app = moduleRef.createNestApplication();
  const logger = await app.resolve(LoggerService);
  const reflector = app.get(Reflector);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter(logger));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.use(cookieParser());
  app.useLogger(logger);

  await app.init();

  return { app, moduleRef };
};

export const closeTestApp = async (
  app: INestApplication<App>,
): Promise<void> => {
  await app.close();
};
