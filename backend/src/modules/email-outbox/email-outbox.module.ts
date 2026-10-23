import { Module } from '@nestjs/common';

import { EmailModule } from '@modules/email/email.module';

import { EmailOutboxService } from './email-outbox.service';
import { EmailOutboxWorker } from './email-outbox.worker';

@Module({
  imports: [EmailModule],
  providers: [EmailOutboxService, EmailOutboxWorker],
  exports: [EmailOutboxService, EmailOutboxWorker],
})
export class EmailOutboxModule {}
