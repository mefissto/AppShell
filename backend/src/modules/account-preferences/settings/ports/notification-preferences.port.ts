import { NotificationSettingsDto } from '../dtos/notification-settings.dto';

/**
 * Runtime DI token for notification preferences integration.
 */
export const NOTIFICATION_PREFERENCES_PORT = Symbol(
  'NOTIFICATION_PREFERENCES_PORT',
);

/**
 * Outbound port for syncing settings with an external/internal notification system.
 *
 * SettingsService depends only on this contract, not on specific providers.
 */
export interface NotificationPreferencesPort {
  sync(userId: string, settings: NotificationSettingsDto): Promise<void>;
}
