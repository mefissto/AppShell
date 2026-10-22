import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScheduleExplorer } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';

import { PrismaExceptionFilter } from '@filters/prisma-exception.filter';
import { LoggerService } from '@loggers/app/logger.service';
import { EmailSenderService } from '@modules/email/email-sender.service';
import { AppModule } from '../../src/app.module';

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

  // Disable timer discovery before app.init(): cronJobs=false does not disable intervals.
  // Tests invoke processing services explicitly; background jobs must not claim their fixtures.
  builder.overrideProvider(ScheduleExplorer).useValue({
    onModuleInit: jest.fn(),
  } satisfies Pick<ScheduleExplorer, 'onModuleInit'>);

  // E2E tests exercise transactions without contacting the external mail provider.
  builder.overrideProvider(EmailSenderService).useValue({
    send: jest.fn().mockResolvedValue({ id: 'test-email-delivery' }),
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

  const app = moduleRef.createNestApplication<INestApplication<App>>();
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
