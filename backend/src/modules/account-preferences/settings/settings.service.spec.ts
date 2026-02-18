import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { ThemePreference } from '@generated/prisma';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';

import { DEFAULT_SETTINGS } from './constants/default-settings.const';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsEntity } from './entities/settings.entity';
import {
  NOTIFICATION_PREFERENCES_PORT,
  NotificationPreferencesPort,
} from './ports/notification-preferences.port';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let prismaService: {
    userSettings: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let notificationPreferences: { sync: jest.Mock };
  let auditLoggerService: { log: jest.Mock };

  const makeSettingsRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'settings-1',
    userId: 'user-1',
    theme: ThemePreference.SYSTEM,
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    ...overrides,
  });

  beforeEach(async () => {
    prismaService = {
      userSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    notificationPreferences = {
      sync: jest.fn(),
    };
    auditLoggerService = { log: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prismaService },
        {
          provide: NOTIFICATION_PREFERENCES_PORT,
          useValue: notificationPreferences as NotificationPreferencesPort,
        },
        { provide: AuditLoggerService, useValue: auditLoggerService },
      ],
    }).compile();

    settingsService = moduleRef.get(SettingsService);
  });

  describe('getByUserId', () => {
    it('should return existing settings when present', async () => {
      const existingSettings = makeSettingsRecord();
      prismaService.userSettings.findUnique.mockResolvedValueOnce(
        existingSettings,
      );

      const result = await settingsService.getByUserId('user-1');

      expect(prismaService.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prismaService.userSettings.create).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(SettingsEntity);
      expect(result).toEqual(expect.objectContaining(existingSettings));
    });

    it('should create defaults when settings are missing', async () => {
      prismaService.userSettings.findUnique.mockResolvedValueOnce(null);
      const createdSettings = makeSettingsRecord({ ...DEFAULT_SETTINGS });
      prismaService.userSettings.create.mockResolvedValueOnce(createdSettings);

      const result = await settingsService.getByUserId('user-1');

      expect(prismaService.userSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          ...DEFAULT_SETTINGS,
        },
      });
      expect(result).toEqual(expect.objectContaining(createdSettings));
    });
  });

  describe('updateByUserId', () => {
    it('should throw NotFoundException when settings are missing', async () => {
      prismaService.userSettings.findUnique.mockResolvedValueOnce(null);

      await expect(
        settingsService.updateByUserId('missing-user', {}),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaService.userSettings.update).not.toHaveBeenCalled();
      expect(notificationPreferences.sync).not.toHaveBeenCalled();
    });

    it('should sync notifications and update settings', async () => {
      const existingSettings = makeSettingsRecord({
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: false,
      });
      prismaService.userSettings.findUnique.mockResolvedValueOnce(
        existingSettings,
      );

      const dto: UpdateSettingsDto = {
        emailNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      };
      const updatedSettings = makeSettingsRecord({
        ...existingSettings,
        ...dto,
      });
      prismaService.userSettings.update.mockResolvedValueOnce(updatedSettings);

      const result = await settingsService.updateByUserId('user-1', dto);

      expect(notificationPreferences.sync).toHaveBeenCalledWith('user-1', {
        email: false,
        push: true,
        inApp: existingSettings.notificationsEnabled,
      });
      expect(prismaService.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: dto,
      });
      expect(result).toEqual(expect.objectContaining(updatedSettings));
    });

    it('should use dto inApp value when notificationsEnabled is provided', async () => {
      const existingSettings = makeSettingsRecord({
        notificationsEnabled: true,
      });
      prismaService.userSettings.findUnique.mockResolvedValueOnce(
        existingSettings,
      );

      const dto: UpdateSettingsDto = { notificationsEnabled: false };
      prismaService.userSettings.update.mockResolvedValueOnce(
        makeSettingsRecord({ ...existingSettings, ...dto }),
      );

      await settingsService.updateByUserId('user-1', dto);

      expect(notificationPreferences.sync).toHaveBeenCalledWith('user-1', {
        email: existingSettings.emailNotificationsEnabled,
        push: existingSettings.pushNotificationsEnabled,
        inApp: false,
      });
    });
  });
});
