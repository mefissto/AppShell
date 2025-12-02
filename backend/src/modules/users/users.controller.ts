import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('list')
  getList(): string {
    return this.usersService.getList();
  }

  @Get(':id')
  getById(@Param('id') id: string): string {
    return this.usersService.getById(id);
  }

  @Post()
  create(@Body() userData: any): string {
    return this.usersService.create(userData);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() userData: any): string {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  delete(@Param('id') id: string): string {
    return this.usersService.delete(id);
  }
}
