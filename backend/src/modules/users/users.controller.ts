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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiRoutes } from '@enums/api-routes';

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

  @Get(':id')
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
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ description: 'User created.', type: UserEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  create(@Body() userData: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(userData);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiOkResponse({ description: 'User updated.', type: UserEntity })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  update(
    @Param('id') id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'c0a8012b-1234-5678-9abc-def012345678',
  })
  @ApiNoContentResponse({ description: 'User deleted.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }
}
