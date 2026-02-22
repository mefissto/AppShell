import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import {
  DiskHealthIndicator,
  HealthCheckService,
  PrismaHealthIndicator
} from '@nestjs/terminus';

import appConfig from '@config/app.config';
import { PrismaService } from '@database/prisma.service';

import { HealthCheckName } from './health.enum';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: PrismaHealthIndicator,
    private readonly prismaClient: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async checkLiveness(): Promise<ReturnType<HealthCheckService['check']>> {
    return this.health.check([]);
  }

  async checkReadiness(): Promise<ReturnType<HealthCheckService['check']>> {
    return this.health.check([
      () => this.prisma.pingCheck(HealthCheckName.DATABASE, this.prismaClient),
      () =>
        this.disk.checkStorage(HealthCheckName.DISK, {
          thresholdPercent: this.config.healthCheckDiskThresholdPercent,
          path: this.config.healthCheckDiskPath,
        }),
    ]);
  }
}
