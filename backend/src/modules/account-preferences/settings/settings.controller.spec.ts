import { Test, TestingModule } from '@nestjs/testing';

import { ThemePreference } from '@generated/prisma';
import { UserEntity } from '@modules/users/entities/user.entity';

import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: {
    getByUserId: jest.Mock;
    updateByUserId: jest.Mock;
  };

  const mockCurrentUser = (): UserEntity =>
    ({
      id: 'user-1',
      email: 'settings@test.com',
      name: 'Settings User',
    }) as UserEntity;

  const mockSettings = () => ({
    userId: 'user-1',
    theme: ThemePreference.SYSTEM,
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: false,
  });

  beforeEach(async () => {
    settingsService = {
      getByUserId: jest.fn(),
      updateByUserId: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: settingsService,
        },
      ],
    }).compile();

    controller = moduleRef.get<SettingsController>(SettingsController);
  });

  describe('getSettings', () => {
    it('should return user settings by current user id', async () => {
      const currentUser = mockCurrentUser();
      const settings = mockSettings();
      settingsService.getByUserId.mockResolvedValueOnce(settings);

      const result = await controller.getSettings(currentUser);

      expect(settingsService.getByUserId).toHaveBeenCalledWith(currentUser.id);
      expect(result).toEqual(settings);
    });
  });

  describe('updateSettings', () => {
    it('should delegate update to service with user id and dto', async () => {
      const currentUser = mockCurrentUser();
      const dto: UpdateSettingsDto = {
        theme: ThemePreference.DARK,
        emailNotificationsEnabled: false,
      };
      const updatedSettings = {
        ...mockSettings(),
        ...dto,
      };
      settingsService.updateByUserId.mockResolvedValueOnce(updatedSettings);

      const result = await controller.updateSettings(currentUser, dto);

      expect(settingsService.updateByUserId).toHaveBeenCalledWith(
        currentUser.id,
        dto,
      );
      expect(result).toEqual(updatedSettings);
    });
  });
});
