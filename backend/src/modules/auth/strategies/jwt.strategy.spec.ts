import { JwtStrategy } from './jwt.strategy';

import { JwtPayload } from '@interfaces/jwt-payload';
import { UsersService } from '@modules/users/users.service';

describe('JwtStrategy', () => {
  let usersService: { findUnique: jest.Mock };
  let strategy: JwtStrategy;

  const config = { jwtSecret: 'jwt-secret' };

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    sid: 'session-1',
  };

  beforeEach(() => {
    usersService = { findUnique: jest.fn() };
    strategy = new JwtStrategy(
      config as any,
      usersService as unknown as UsersService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return user from validate', async () => {
    const user = { id: 'user-1', email: 'user@example.com' } as any;
    usersService.findUnique.mockResolvedValueOnce(user);

    const result = await strategy.validate(payload);

    expect(result).toBe(user);
    expect(usersService.findUnique).toHaveBeenCalledWith({ id: payload.sub });
  });

  it('should return null when user not found', async () => {
    usersService.findUnique.mockResolvedValueOnce(null);

    const result = await strategy.validate(payload);

    expect(result).toBeNull();
    expect(usersService.findUnique).toHaveBeenCalledWith({ id: payload.sub });
  });
});
