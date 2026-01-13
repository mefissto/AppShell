import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

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

  /**
   * Generates a random token of specified byte size and returns it as a hexadecimal string.
   * @param size
   * @returns {string} Hexadecimal representation of the random token.
   */
  generateRandomHash(size = 32): string {
    return randomBytes(size).toString('hex');
  }
}
