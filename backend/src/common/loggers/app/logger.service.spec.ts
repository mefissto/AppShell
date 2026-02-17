import { LogLevel } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

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
      ],
    }).compile();

    service = await module.resolve<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
