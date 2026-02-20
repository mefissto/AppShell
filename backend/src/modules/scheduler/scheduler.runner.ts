import { Injectable } from '@nestjs/common';

import { LoggerService } from '@loggers/app/logger.service';

@Injectable()
export class SchedulerRunner {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SchedulerRunner.name);
  }

  async execute(jobName: string, handler: () => Promise<void>) {
    const startedAt = performance.now();
    this.logger.log({ jobName, event: 'start' });

    try {
      await handler();
      this.logger.log({
        jobName,
        event: 'success',
        durationMs: performance.now() - startedAt,
      });
    } catch (error) {
      this.logger.error({
        jobName,
        event: 'failed',
        durationMs: performance.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      throw error; // rethrow to allow Nest's scheduler to handle retries/failures as configured
    }
  }
}
