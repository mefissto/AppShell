import { Test, TestingModule } from '@nestjs/testing';

import { UserEntity } from '@modules/users/entities/user.entity';

import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: {
    getByUserId: jest.Mock;
    updateByUserId: jest.Mock;
  };

  const mockCurrentUser = (): UserEntity =>
    ({
      id: 'user-1',
      email: 'profile@test.com',
      name: 'Profile User',
    }) as UserEntity;

  const mockProfile = () => ({
    userId: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    timezone: 'UTC',
    language: 'en',
    avatarUrl: null,
  });

  beforeEach(async () => {
    profileService = {
      getByUserId: jest.fn(),
      updateByUserId: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: profileService,
        },
      ],
    }).compile();

    controller = moduleRef.get<ProfileController>(ProfileController);
  });

  describe('getProfile', () => {
    it('should return profile by current user id', async () => {
      const currentUser = mockCurrentUser();
      const profile = mockProfile();
      profileService.getByUserId.mockResolvedValueOnce(profile);

      const result = await controller.getProfile(currentUser, {} as Request);

      expect(profileService.getByUserId).toHaveBeenCalledWith(currentUser.id);
      expect(result).toEqual(profile);
    });
  });

  describe('updateProfile', () => {
    it('should delegate update to service with user id and dto', async () => {
      const currentUser = mockCurrentUser();
      const dto: UpdateProfileDto = {
        firstName: 'Updated',
        timezone: 'Europe/Berlin',
      };
      const updatedProfile = {
        ...mockProfile(),
        ...dto,
      };
      profileService.updateByUserId.mockResolvedValueOnce(updatedProfile);

      const result = await controller.updateProfile(currentUser, dto);

      expect(profileService.updateByUserId).toHaveBeenCalledWith(
        currentUser.id,
        dto,
      );
      expect(result).toEqual(updatedProfile);
    });
  });
});
