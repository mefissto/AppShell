import { Injectable } from '@nestjs/common';

import { LoggerService } from '@loggers/app/logger.service';

@Injectable()
export class SchedulerRunner {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SchedulerRunner.name);
  }

  async execute(jobName: string, callback: () => Promise<void>) {
    const startedAt = Date.now();
    this.logger.log({ jobName, event: 'start' });

    try {
      await callback();
      this.logger.log({
        jobName,
        event: 'success',
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.logger.error({
        jobName,
        event: 'failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
