import { Test } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';

import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ProfileEntity } from './entities/profile.entity';
import {
  AVATAR_STORAGE_PORT,
  AvatarStoragePort,
} from './ports/avatar-storage.port';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let profileService: ProfileService;
  let prismaService: {
    userProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let avatarStorage: {
    upload: jest.Mock;
    remove: jest.Mock;
  };
  let auditLoggerService: { log: jest.Mock };

  const makeProfileRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    timezone: 'UTC',
    language: 'en',
    avatarUrl: null,
    ...overrides,
  });

  beforeEach(async () => {
    prismaService = {
      userProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    avatarStorage = {
      upload: jest.fn(),
      remove: jest.fn(),
    };
    auditLoggerService = { log: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prismaService },
        {
          provide: AVATAR_STORAGE_PORT,
          useValue: avatarStorage as AvatarStoragePort,
        },
        { provide: AuditLoggerService, useValue: auditLoggerService },
      ],
    }).compile();

    profileService = moduleRef.get(ProfileService);
  });

  describe('getByUserId', () => {
    it('should return existing profile when present', async () => {
      const existingProfile = makeProfileRecord();
      prismaService.userProfile.findUnique.mockResolvedValueOnce(
        existingProfile,
      );

      const result = await profileService.getByUserId('user-1');

      expect(prismaService.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prismaService.userProfile.create).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(ProfileEntity);
      expect(result).toMatchObject({
        id: existingProfile.id,
        userId: existingProfile.userId,
        firstName: existingProfile.firstName,
        lastName: existingProfile.lastName,
        displayName: existingProfile.displayName,
        timezone: existingProfile.timezone,
        language: existingProfile.language,
      });
    });

    it('should create default profile when missing', async () => {
      prismaService.userProfile.findUnique.mockResolvedValueOnce(null);
      const createdProfile = makeProfileRecord({
        firstName: null,
        lastName: null,
        displayName: null,
      });
      prismaService.userProfile.create.mockResolvedValueOnce(createdProfile);

      const result = await profileService.getByUserId('user-1');

      expect(prismaService.userProfile.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(result).toMatchObject({
        id: createdProfile.id,
        userId: createdProfile.userId,
        timezone: createdProfile.timezone,
        language: createdProfile.language,
      });
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.displayName).toBeUndefined();
    });
  });

  describe('updateByUserId', () => {
    it('should upload avatar placeholder and update profile', async () => {
      avatarStorage.upload.mockResolvedValueOnce(
        'https://cdn.example/avatar.jpg',
      );
      const dto: UpdateProfileDto = {
        firstName: 'Updated',
        language: 'en-US',
      };
      const updatedProfile = makeProfileRecord({ ...dto });
      prismaService.userProfile.update.mockResolvedValueOnce(updatedProfile);

      const result = await profileService.updateByUserId('user-1', dto);

      expect(avatarStorage.upload).toHaveBeenCalledWith(
        'user-1',
        expect.any(Buffer),
        'image/png',
      );
      const uploadedBuffer = avatarStorage.upload.mock.calls[0][1] as Buffer;
      expect(uploadedBuffer).toHaveLength(0);

      expect(prismaService.userProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: dto,
      });
      expect(result).toBeInstanceOf(ProfileEntity);
      expect(result).toMatchObject({
        id: updatedProfile.id,
        userId: updatedProfile.userId,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        displayName: updatedProfile.displayName,
        timezone: updatedProfile.timezone,
        language: updatedProfile.language,
      });
    });
  });
});
