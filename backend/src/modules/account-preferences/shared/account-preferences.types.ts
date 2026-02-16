import { ProfileEntity } from '../profile/entities/profile.entity';
import { SettingsEntity } from '../settings/entities/settings.entity';

export type AccountPreferences = {
  profile: ProfileEntity;
  settings: SettingsEntity;
};
