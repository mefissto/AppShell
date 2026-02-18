import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { AuditLoggerService } from '@loggers/audit/audit-logger.service';
import { AccountPreferencesAuditAction } from '@loggers/enums/audit-actions.enum';

import { DEFAULT_SETTINGS } from './constants/default-settings.const';
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
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async getByUserId(userId: string): Promise<SettingsEntity> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      return new SettingsEntity(settings);
    }

    return this.prisma.userSettings
      .create({ data: { userId, ...DEFAULT_SETTINGS } })
      .then((created) => new SettingsEntity(created));
  }

  async updateByUserId(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<SettingsEntity> {
    const existingSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!existingSettings) {
      throw new NotFoundException('User settings not found');
    }

    const settingsEntity = new SettingsEntity(existingSettings);
    const notificationSettings = this.getNotificationSettings(
      settingsEntity,
      dto,
    );

    // Sync notification preferences with the external service before updating settings in the database
    // TODO - optimize by only syncing if notification-related fields are being updated
    await this.notificationPreferences.sync(userId, notificationSettings);

    const updatedSettings = await this.prisma.userSettings.update({
      where: { userId },
      data: { ...dto },
    });

    this.auditLogger.log({
      action: AccountPreferencesAuditAction.ACCOUNT_SETTINGS_UPDATE_SUCCESS,
      targetEntity: SettingsEntity.name,
      targetEntityId: updatedSettings.id,
    });

    return new SettingsEntity(updatedSettings);
  }

  private getNotificationSettings(
    existing: SettingsEntity,
    updates: UpdateSettingsDto,
  ): NotificationSettingsDto {
    return {
      email:
        updates.emailNotificationsEnabled ?? existing.emailNotificationsEnabled,
      push:
        updates.pushNotificationsEnabled ?? existing.pushNotificationsEnabled,
      inApp: updates.notificationsEnabled ?? existing.notificationsEnabled,
    };
  }
}
