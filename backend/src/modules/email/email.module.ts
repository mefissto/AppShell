import { Module } from '@nestjs/common';

import { EmailSenderService } from './email-sender.service';
import { EmailTemplateService } from './email-template.service';

@Module({
  providers: [EmailSenderService, EmailTemplateService],
  exports: [EmailSenderService, EmailTemplateService],
})
export class EmailModule {}
