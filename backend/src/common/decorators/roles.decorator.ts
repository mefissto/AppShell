import { UserRoles } from '@enums/user-roles.enum';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Define a type for the roles parameter to ensure it always contains at least one role
declare type RolesParam = [UserRoles, ...UserRoles[]];

export const Roles = (...roles: RolesParam) => {
  return SetMetadata(ROLES_KEY, roles);
};
