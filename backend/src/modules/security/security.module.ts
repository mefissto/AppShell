import { Module } from '@nestjs/common';

import { BcryptHashingService } from './services/bcrypt-hashing.service';
import { HashingService } from './services/hashing.service';
import { SessionsService } from './services/sessions.service';

@Module({
  providers: [
    {
      provide: HashingService,
      useClass: BcryptHashingService,
    },
    SessionsService,
  ],
  exports: [HashingService, SessionsService],
})
export class SecurityModule {}
