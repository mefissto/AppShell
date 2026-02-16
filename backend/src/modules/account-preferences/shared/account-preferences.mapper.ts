import { ProfileEntity } from '../profile/entities/profile.entity';
import { SettingsEntity } from '../settings/entities/settings.entity';

export class AccountPreferencesMapper {
  static merge(profile: ProfileEntity, settings: SettingsEntity): {
    profile: ProfileEntity;
    settings: SettingsEntity;
  } {
    return { profile, settings };
  }
}
