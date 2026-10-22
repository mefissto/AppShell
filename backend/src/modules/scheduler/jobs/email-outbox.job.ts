import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import schedulerConfig from '@config/scheduler.config';
import { EmailOutboxWorker } from '@modules/email-outbox/email-outbox.worker';

import { JobName } from '../enums/job-name.enum';
import { SchedulerRunner } from '../scheduler.runner';

const emailOutboxInterval = schedulerConfig().emailOutboxInterval;

@Injectable()
export class EmailOutboxJob {
  private isProcessing = false;

  constructor(
    private readonly runner: SchedulerRunner,
    private readonly emailOutboxWorker: EmailOutboxWorker,
  ) {}

  @Interval(JobName.EmailOutbox, emailOutboxInterval)
  async handle(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      await this.runner.execute(JobName.EmailOutbox, async () => {
        await this.emailOutboxWorker.processBatch();
      });
    } finally {
      this.isProcessing = false;
    }
  }
}
