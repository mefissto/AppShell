import {
  DiskHealthIndicator,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';

import appConfig from '@config/app.config';
import { PrismaService } from '@database/prisma.service';

import { HealthCheckName } from './health.enum';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let health: {
    check: jest.Mock;
  };
  let prisma: {
    pingCheck: jest.Mock;
  };
  let disk: {
    checkStorage: jest.Mock;
  };
  let prismaClient: Record<string, never>;
  const config = {
    healthCheckDiskThresholdPercent: 0.9,
    healthCheckDiskPath: '/',
  };

  beforeEach(async () => {
    health = {
      check: jest.fn(async (indicators: Array<() => Promise<unknown>>) => {
        await Promise.all(indicators.map((indicator) => indicator()));
        return { status: 'ok' };
      }),
    };

    prisma = {
      pingCheck: jest.fn().mockResolvedValue({
        [HealthCheckName.DATABASE]: { status: 'up' },
      }),
    };

    disk = {
      checkStorage: jest.fn().mockResolvedValue({
        [HealthCheckName.DISK]: { status: 'up' },
      }),
    };

    prismaClient = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: HealthCheckService, useValue: health },
        { provide: DiskHealthIndicator, useValue: disk },
        { provide: PrismaHealthIndicator, useValue: prisma },
        { provide: PrismaService, useValue: prismaClient },
        { provide: appConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkLiveness', () => {
    it('should run health check with no indicators', async () => {
      await service.checkLiveness();

      expect(health.check).toHaveBeenCalledWith([]);
      expect(prisma.pingCheck).not.toHaveBeenCalled();
      expect(disk.checkStorage).not.toHaveBeenCalled();
    });
  });

  describe('checkReadiness', () => {
    it('should run readiness checks for database and disk', async () => {
      await service.checkReadiness();

      expect(health.check).toHaveBeenCalledTimes(1);
      expect(prisma.pingCheck).toHaveBeenCalledWith(
        HealthCheckName.DATABASE,
        prismaClient,
      );
      expect(disk.checkStorage).toHaveBeenCalledWith(HealthCheckName.DISK, {
        thresholdPercent: config.healthCheckDiskThresholdPercent,
        path: config.healthCheckDiskPath,
      });
    });
  });
});
