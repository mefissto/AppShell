import { LogLevel } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AsyncLocalStorageService } from '@common/async-local-storage/async-local-storage.service';
import appConfig from '@config/app.config';
import { EnvironmentModes } from '@interfaces/environment-variables';

import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const mockConfig: ConfigType<typeof appConfig> = {
      env: EnvironmentModes.TEST,
      name: 'AppShell',
      logLevel: 'log' as LogLevel,
    } as ConfigType<typeof appConfig>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        { provide: appConfig.KEY, useValue: mockConfig },
        {
          provide: AsyncLocalStorageService,
          useValue: { getRequestId: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    service = await module.resolve<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
