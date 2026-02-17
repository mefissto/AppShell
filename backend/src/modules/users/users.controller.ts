import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { ApiRoutes } from '@enums/api-routes';

import { Roles } from '@decorators/roles.decorator';
import { UserRoles } from '@enums/user-roles.enum';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiCookieAuth('Authentication')
@Controller(ApiRoutes.USERS)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRoles.SUPER_ADMIN) // Only allow access to users with the SUPER_ADMIN role
  @ApiExcludeEndpoint() // Hide from Swagger docs
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({
    description: 'List of users retrieved.',
    type: UserEntity,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  findAll(): Promise<UserEntity[]> {
    return this.usersService.findAll();
  }

  @Get('/me')
  @ApiOperation({ summary: 'Get the current user' })
  @ApiOkResponse({ description: 'User retrieved.', type: UserEntity })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  findCurrentUser(@CurrentUser() user: UserEntity): Promise<UserEntity> {
    return Promise.resolve(user);
  }

  @Get(':id')
  @Roles(UserRoles.SUPER_ADMIN) // Only allow access to users with the SUPER_ADMIN role
  @ApiExcludeEndpoint() // Hide from Swagger docs
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiOkResponse({ description: 'User retrieved.', type: UserEntity })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.usersService.findOneById(id);
  }

  @Post()
  @Roles(UserRoles.SUPER_ADMIN) // Only allow access to users with the SUPER_ADMIN role
  @ApiExcludeEndpoint() // Hide from Swagger docs
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ description: 'User created.', type: UserEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  create(@Body() userData: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(userData);
  }

  @Patch(':id')
  @Roles(UserRoles.SUPER_ADMIN) // Only allow access to users with the SUPER_ADMIN role
  @ApiExcludeEndpoint() // Hide from Swagger docs
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiOkResponse({ description: 'User updated.', type: UserEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  update(
    @Param('id') id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @Roles(UserRoles.SUPER_ADMIN) // Only allow access to users with the SUPER_ADMIN role
  @ApiExcludeEndpoint() // Hide from Swagger docs
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiNoContentResponse({ description: 'User deleted.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }
}
