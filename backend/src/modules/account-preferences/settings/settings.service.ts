import { ThemePreference } from '@generated/prisma';
import { Inject, Injectable } from '@nestjs/common';

import { NotificationSettingsDto } from './dtos/notification-settings.dto';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsEntity } from './entities/settings.entity';
import type { NotificationPreferencesPort } from './ports/notification-preferences.port';
import { NOTIFICATION_PREFERENCES_PORT } from './ports/notification-preferences.port';

/**
 * Application service for account settings.
 *
 * Business logic depends on the notification port contract only.
 * The concrete adapter is selected in SettingsModule via DI token binding.
 */
@Injectable()
export class SettingsService {
  constructor(
    @Inject(NOTIFICATION_PREFERENCES_PORT)
    private readonly notificationPreferences: NotificationPreferencesPort,
  ) {}

  async getByUserId(userId: string): Promise<SettingsEntity> {
    return {
      userId,
      theme: ThemePreference.SYSTEM,
      notificationsEnabled: true,
      emailNotificationsEnabled: true,
      pushNotificationsEnabled: false,
    };
  }

  async updateByUserId(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<SettingsEntity> {
    const notificationSettings: NotificationSettingsDto = {
      email: dto.emailNotificationsEnabled,
      push: dto.pushNotificationsEnabled,
      inApp: dto.notificationsEnabled,
    };

    await this.notificationPreferences.sync(userId, notificationSettings);

    return {
      userId,
      theme: dto.theme ?? ThemePreference.SYSTEM,
      notificationsEnabled: dto.notificationsEnabled ?? true,
      emailNotificationsEnabled: dto.emailNotificationsEnabled ?? true,
      pushNotificationsEnabled: dto.pushNotificationsEnabled ?? false,
    };
  }
}
