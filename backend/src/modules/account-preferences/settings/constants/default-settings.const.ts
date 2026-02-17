import { ThemePreference } from '@generated/prisma';

import { SettingsModel } from '../entities/settings.entity';

export const DEFAULT_SETTINGS: SettingsModel = {
  theme: ThemePreference.SYSTEM,
  notificationsEnabled: true,
  emailNotificationsEnabled: true,
  pushNotificationsEnabled: false,
};
