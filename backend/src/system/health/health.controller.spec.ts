import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: {
    checkLiveness: jest.Mock;
    checkReadiness: jest.Mock;
  };

  beforeEach(async () => {
    healthService = {
      checkLiveness: jest.fn().mockResolvedValue({ status: 'ok' }),
      checkReadiness: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkLiveness', () => {
    it('should delegate to health service', async () => {
      await controller.checkLiveness();

      expect(healthService.checkLiveness).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkReadiness', () => {
    it('should delegate to health service', async () => {
      await controller.checkReadiness();

      expect(healthService.checkReadiness).toHaveBeenCalledTimes(1);
    });
  });
});
