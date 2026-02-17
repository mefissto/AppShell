const authGuardFactoryMock = jest.fn().mockReturnValue(class MockAuthGuard {});

jest.mock('@nestjs/passport', () => ({
  AuthGuard: authGuardFactoryMock,
}));

import { AuthStrategy } from '@enums/auth-strategy.enum';

import { LocalAuthGuard } from './local-auth.guard';

describe('LocalAuthGuard', () => {
  it('should register passport local strategy', () => {
    expect(authGuardFactoryMock).toHaveBeenCalledWith(AuthStrategy.LOCAL);
  });

  it('should be instantiable', () => {
    const guard = new LocalAuthGuard();

    expect(guard).toBeDefined();
  });
});
