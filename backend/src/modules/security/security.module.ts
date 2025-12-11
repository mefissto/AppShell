import { Module } from '@nestjs/common';

import { BcryptHashingService } from './services/bcrypt-hashing.service';
import { HashingService } from './services/hashing.service';

@Module({
  providers: [
    {
      provide: HashingService,
      useClass: BcryptHashingService,
    },
  ],
  exports: [HashingService],
})
export class SecurityModule {}
