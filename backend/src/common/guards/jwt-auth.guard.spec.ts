const superCanActivateMock = jest.fn();
const authGuardFactoryMock = jest.fn().mockImplementation(() => {
  class MockAuthGuard {
    canActivate(context: unknown) {
      return superCanActivateMock(context);
    }
  }

  return MockAuthGuard;
});

jest.mock('@nestjs/passport', () => ({
  AuthGuard: authGuardFactoryMock,
}));

import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_ROUTE_KEY } from '@decorators/public-route.decorator';
import { AuthStrategy } from '@enums/auth-strategy.enum';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const createContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
    superCanActivateMock.mockReset();
  });

  it('should register passport jwt strategy', () => {
    expect(authGuardFactoryMock).toHaveBeenCalledWith(AuthStrategy.JWT);
  });

  it('should allow access for public routes', () => {
    const context = createContext();
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    const result = guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    expect(superCanActivateMock).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should delegate to passport auth guard for non-public routes', () => {
    const context = createContext();
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    superCanActivateMock.mockReturnValueOnce(true);

    const result = guard.canActivate(context);

    expect(superCanActivateMock).toHaveBeenCalledWith(context);
    expect(result).toBe(true);
  });
});
