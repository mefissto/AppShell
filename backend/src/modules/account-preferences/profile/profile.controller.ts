import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { UserEntity } from '@modules/users/entities/user.entity';

import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ProfileEntity } from './entities/profile.entity';
import { ProfileService } from './profile.service';

/**
 * HTTP entry point for profile preferences.
 */
@ApiTags('Account Preferences')
@ApiCookieAuth('Authentication')
@Controller(ApiRoutes.PROFILE)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile preferences' })
  @ApiOkResponse({
    description: 'Profile preferences retrieved.',
    type: ProfileEntity,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  getProfile(
    @CurrentUser() currentUser: UserEntity,
    @Req() req: Request,
  ): Promise<ProfileEntity> {
    return this.profileService.getByUserId(currentUser.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user profile preferences' })
  @ApiOkResponse({
    description: 'Profile preferences updated.',
    type: ProfileEntity,
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  updateProfile(
    @CurrentUser() currentUser: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    return this.profileService.updateByUserId(currentUser.id, dto);
  }
}
