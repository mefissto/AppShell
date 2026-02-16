import { Module } from '@nestjs/common';

import { LocalAvatarStorageAdapter } from './adapters/local-avatar-storage.adapter';
import { AVATAR_STORAGE_PORT } from './ports/avatar-storage.port';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

/**
 * Profile module wiring:
 * - Controller -> Service
 * - Service -> AVATAR_STORAGE_PORT (token)
 * - Token -> LocalAvatarStorageAdapter (concrete implementation)
 */
@Module({
  controllers: [ProfileController],
  providers: [
    ProfileService,
    LocalAvatarStorageAdapter,
    {
      provide: AVATAR_STORAGE_PORT,
      useExisting: LocalAvatarStorageAdapter,
    },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
