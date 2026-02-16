import { Injectable } from '@nestjs/common';

import { NotificationSettingsDto } from '../dtos/notification-settings.dto';
import { NotificationPreferencesPort } from '../ports/notification-preferences.port';

/**
 * Placeholder adapter for notification preference sync.
 *
 * Replace internals with a real integration later (e.g. notification service API,
 * message queue, or external provider SDK).
 */
@Injectable()
export class LocalNotificationPreferencesAdapter implements NotificationPreferencesPort {
  async sync(
    _userId: string,
    _settings: NotificationSettingsDto,
  ): Promise<void> {
    return;
  }
}
