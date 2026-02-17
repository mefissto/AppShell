import {
    NotFoundException,
    type ExecutionContext,
    type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRoles } from '@enums/user-roles.enum';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const createContext = (role?: UserRoles): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(() => class TestController {} as Type<unknown>),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({ user: { role } })),
      })),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should allow access when no roles are required', () => {
    const context = createContext(UserRoles.USER);
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const context = createContext(UserRoles.SUPER_ADMIN);
    reflector.getAllAndOverride.mockReturnValueOnce([UserRoles.SUPER_ADMIN]);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw NotFoundException when user has no role', () => {
    const context = createContext(undefined);
    reflector.getAllAndOverride.mockReturnValueOnce([UserRoles.SUPER_ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(NotFoundException);
  });

  it('should throw NotFoundException when user lacks required role', () => {
    const context = createContext(UserRoles.USER);
    reflector.getAllAndOverride.mockReturnValueOnce([UserRoles.SUPER_ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(NotFoundException);
  });
});
