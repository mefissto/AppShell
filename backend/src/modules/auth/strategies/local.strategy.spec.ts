import { LocalStrategy } from './local.strategy';

import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let authService: { validateUser: jest.Mock };
  let strategy: LocalStrategy;

  beforeEach(() => {
    authService = { validateUser: jest.fn() };
    strategy = new LocalStrategy(authService as unknown as AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return user from validate', async () => {
    const user = { id: 'user-1', email: 'user@example.com' } as any;
    authService.validateUser.mockResolvedValueOnce(user);

    const result = await strategy.validate('user@example.com', 'password');

    expect(result).toBe(user);
    expect(authService.validateUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    });
  });

  it('should return null when user is invalid', async () => {
    authService.validateUser.mockResolvedValueOnce(null);

    const result = await strategy.validate('user@example.com', 'password');

    expect(result).toBeNull();
    expect(authService.validateUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    });
  });
});
