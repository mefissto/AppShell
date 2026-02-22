import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';

import { PublicRoute } from '@decorators/public-route.decorator';
import { PublicThrottle } from '@decorators/throttle.decorator';

import { HealthService } from './health.service';

@PublicRoute()
@PublicThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/live')
  @HealthCheck()
  checkLiveness(): ReturnType<HealthService['checkLiveness']> {
    return this.healthService.checkLiveness();
  }

  @Get('/ready')
  @HealthCheck()
  checkReadiness(): ReturnType<HealthService['checkReadiness']> {
    return this.healthService.checkReadiness();
  }
}
