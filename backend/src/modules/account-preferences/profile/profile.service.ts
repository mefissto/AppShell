import { Inject, Injectable } from '@nestjs/common';

import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ProfileEntity } from './entities/profile.entity';
import type { AvatarStoragePort } from './ports/avatar-storage.port';
import { AVATAR_STORAGE_PORT } from './ports/avatar-storage.port';

/**
 * Application service for profile preferences.
 *
 * It depends on a port contract (AvatarStoragePort), not on any specific SDK/provider.
 * That keeps business logic stable when infrastructure changes.
 */
@Injectable()
export class ProfileService {
  constructor(
    @Inject(AVATAR_STORAGE_PORT)
    private readonly avatarStorage: AvatarStoragePort,
  ) {}

  async getByUserId(userId: string): Promise<ProfileEntity> {
    return {
      userId,
      firstName: null,
      lastName: null,
      displayName: null,
      timezone: 'UTC',
      language: 'en',
      avatarUrl: null,
    };
  }

  async updateByUserId(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    /**
     * Placeholder usage of the port so the connection is visible now.
     * In real flow this should run only when avatar file upload is requested,
     * then the returned URL is persisted to database.
     */
    await this.avatarStorage.upload(userId, Buffer.alloc(0), 'image/png');

    return {
      userId,
      displayName: dto.displayName ?? null,
      timezone: dto.timezone ?? 'UTC',
      language: dto.language ?? 'en',
      firstName: null,
      lastName: null,
      avatarUrl: null,
    };
  }
}
