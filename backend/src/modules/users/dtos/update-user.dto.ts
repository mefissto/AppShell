import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

class PartialCreateUserDto extends PartialType(CreateUserDto) {}

/**
 * Data Transfer Object for updating a user.
 * Extends CreateUserDto to make all fields optional.
 */
export class UpdateUserDto extends OmitType(PartialCreateUserDto, [
  'password',
]) {}
