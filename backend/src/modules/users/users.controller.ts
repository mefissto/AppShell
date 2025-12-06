import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ApiRoutes } from '@enums/api-routes';

import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller(ApiRoutes.USERS)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<UserEntity[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.usersService.findOneById(id);
  }

  @Post()
  create(@Body() userData: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(userData);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<UserEntity> {
    return this.usersService.delete(id);
  }
}
