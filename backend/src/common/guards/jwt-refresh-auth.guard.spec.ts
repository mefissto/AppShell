const authGuardFactoryMock = jest.fn().mockReturnValue(class MockAuthGuard {});

jest.mock('@nestjs/passport', () => ({
  AuthGuard: authGuardFactoryMock,
}));

import { AuthStrategy } from '@enums/auth-strategy.enum';

import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';

describe('JwtRefreshAuthGuard', () => {
  it('should register passport jwt-refresh strategy', () => {
    expect(authGuardFactoryMock).toHaveBeenCalledWith(AuthStrategy.JWT_REFRESH);
  });

  it('should be instantiable', () => {
    const guard = new JwtRefreshAuthGuard();

    expect(guard).toBeDefined();
  });
});
