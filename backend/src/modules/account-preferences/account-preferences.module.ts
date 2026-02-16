import { Module } from '@nestjs/common';

import { ProfileModule } from './profile/profile.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [ProfileModule, SettingsModule],
})
export class AccountPreferencesModule {}
