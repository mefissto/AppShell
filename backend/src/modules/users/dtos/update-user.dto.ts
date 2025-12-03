import { PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

/**
 * Data Transfer Object for updating a user.
 * Extends CreateUserDto to make all fields optional.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
