import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { UserEntity } from '@modules/users/entities/user.entity';

import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsEntity } from './entities/settings.entity';
import { SettingsService } from './settings.service';

/**
 * HTTP entry point for settings operations.
 */
@ApiTags('Account Preferences')
@ApiCookieAuth('Authentication')
@Controller(ApiRoutes.SETTINGS)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiOkResponse({
    description: 'User settings retrieved.',
    type: SettingsEntity,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  getSettings(@CurrentUser() currentUser: UserEntity): Promise<SettingsEntity> {
    return this.settingsService.getByUserId(currentUser.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user settings' })
  @ApiOkResponse({
    description: 'User settings updated.',
    type: SettingsEntity,
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'User settings not found.' })
  updateSettings(
    @CurrentUser() currentUser: UserEntity,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsEntity> {
    return this.settingsService.updateByUserId(currentUser.id, dto);
  }
}
