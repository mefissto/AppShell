import type { Request } from 'express';

import { CookieKeys } from '@enums/cookie-keys.enum';
import { JwtPayload } from '@interfaces/jwt-payload';

import { AuthService } from '../auth.service';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  let authService: { validateRefreshToken: jest.Mock };
  let strategy: JwtRefreshStrategy;

  const config = { jwtRefreshSecret: 'refresh-secret' };

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    sid: 'session-1',
  };

  const makeRequest = (refreshToken?: string): Request =>
    ({
      cookies: refreshToken ? { [CookieKeys.RefreshToken]: refreshToken } : {},
    }) as unknown as Request;

  beforeEach(() => {
    authService = { validateRefreshToken: jest.fn() };
    strategy = new JwtRefreshStrategy(
      authService as unknown as AuthService,
      config as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate refresh token from cookies', async () => {
    const request = makeRequest('refresh-token');
    authService.validateRefreshToken.mockResolvedValueOnce({ id: 'user-1' });

    const result = await strategy.validate(request, payload);

    expect(result).toEqual({ id: 'user-1' });
    expect(authService.validateRefreshToken).toHaveBeenCalledWith(
      payload.sid,
      'refresh-token',
    );
  });

  it('should pass undefined when refresh token missing', async () => {
    const request = makeRequest();
    authService.validateRefreshToken.mockResolvedValueOnce(null);

    const result = await strategy.validate(request, payload);

    expect(result).toBeNull();
    expect(authService.validateRefreshToken).toHaveBeenCalledWith(
      payload.sid,
      undefined,
    );
  });
});
