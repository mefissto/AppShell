import 'reflect-metadata';

import { UserRoles } from '@enums/user-roles.enum';

import { ROLES_KEY, Roles } from './roles.decorator';

class RolesTestController {
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  handler() {
    return true;
  }
}

describe('Roles', () => {
  it('sets roles metadata on a handler', () => {
    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      RolesTestController.prototype.handler,
    );

    expect(metadata).toEqual([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]);
  });
});
