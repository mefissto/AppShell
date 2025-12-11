import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import appConfig from '@config/app.config';
import { HashingService } from './hashing.service';

@Injectable()
export class BcryptHashingService implements HashingService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async hash(payload: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.config.hashSaltRounds);

    return await bcrypt.hash(payload, salt);
  }

  async compare(payload: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(payload, hashed);
  }
}
