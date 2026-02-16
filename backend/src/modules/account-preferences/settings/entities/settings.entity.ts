import { ThemePreference } from '../dtos/update-settings.dto';

export class SettingsEntity {
  userId: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}
