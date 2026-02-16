import { Module } from '@nestjs/common';

import { LocalNotificationPreferencesAdapter } from './adapters/local-notification-preferences.adapter';
import { NOTIFICATION_PREFERENCES_PORT } from './ports/notification-preferences.port';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * Settings module wiring:
 * - Controller -> SettingsService
 * - SettingsService -> NOTIFICATION_PREFERENCES_PORT
 * - Token -> LocalNotificationPreferencesAdapter
 */
@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    LocalNotificationPreferencesAdapter,
    {
      provide: NOTIFICATION_PREFERENCES_PORT,
      useExisting: LocalNotificationPreferencesAdapter,
    },
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
