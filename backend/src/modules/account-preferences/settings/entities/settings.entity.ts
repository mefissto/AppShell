import { ThemePreference } from '@generated/prisma';

export class SettingsEntity {
  userId: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}
