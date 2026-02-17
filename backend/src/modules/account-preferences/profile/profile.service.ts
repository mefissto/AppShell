import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';

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
    private readonly prisma: PrismaService,
  ) {}

  async getByUserId(userId: string): Promise<ProfileEntity> {
    const profileData = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (profileData) {
      return new ProfileEntity(profileData);
    }

    // If no profile exists for the user, create a default one
    return this.prisma.userProfile
      .create({ data: { userId } })
      .then((createdProfile) => new ProfileEntity(createdProfile));
  }

  async updateByUserId(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    /**
     * Placeholder usage of the port so the connection is visible now.
     * In real flow this should run only when avatar file upload is requested,
     * then the returned URL is persisted to database.
     * TODO: Implement actual avatar upload flow with file handling and URL management.
     */
    await this.avatarStorage.upload(userId, Buffer.alloc(0), 'image/png');

    return this.prisma.userProfile
      .update({
        where: { userId },
        data: dto,
      })
      .then((updatedProfile) => new ProfileEntity(updatedProfile));
  }
}
