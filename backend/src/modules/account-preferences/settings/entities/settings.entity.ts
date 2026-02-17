import { BaseEntity } from '@entities/base.entity';
import { ThemePreference } from '@generated/prisma';

export interface SettingsModel {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

export class SettingsEntity extends BaseEntity implements SettingsModel {
  userId: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;

  constructor(partial: Partial<SettingsEntity>) {
    super();
    Object.assign(this, SettingsEntity.filterNullishValues(partial));
  }
}
