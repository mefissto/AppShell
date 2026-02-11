import { JwtService } from '@nestjs/jwt';

import { JwtEnvConfig } from '@interfaces/environment-variables';
import { JwtPayload } from '@interfaces/jwt-payload';

import { JwtTokenProvider } from './jwt-token.provider';

describe('JwtTokenProvider', () => {
  let jwtService: { signAsync: jest.Mock; decode: jest.Mock };
  let provider: JwtTokenProvider;
  let config: { refreshSecret: string; refreshTokenTtl: string };

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    sid: 'session-1',
  };

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
      decode: jest.fn(),
    };
    config = {
      refreshSecret: 'refresh-secret',
      refreshTokenTtl: '1h',
    };

    provider = new JwtTokenProvider(
      jwtService as unknown as JwtService,
      config as unknown as JwtEnvConfig,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await provider.generateTokenPair(payload);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, payload);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, payload, {
        secret: config.refreshSecret,
        expiresIn: config.refreshTokenTtl,
      });
    });
  });

  describe('generateAccessToken', () => {
    it('should sign payload with default settings', async () => {
      jwtService.signAsync.mockResolvedValueOnce('access-token');

      const token = await provider.generateAccessToken(payload);

      expect(token).toBe('access-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload);
    });
  });

  describe('generateRefreshToken', () => {
    it('should sign payload with refresh settings', async () => {
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const token = await provider.generateRefreshToken(payload);

      expect(token).toBe('refresh-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload, {
        secret: config.refreshSecret,
        expiresIn: config.refreshTokenTtl,
      });
    });
  });

  describe('getTokenExpirationTimestamp', () => {
    it('should return null when token has no exp', async () => {
      jwtService.decode.mockReturnValueOnce({ sid: 'session-1' });

      const result = await provider.getTokenExpirationTimestamp('token');

      expect(result).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      jwtService.decode.mockReturnValueOnce(null);

      const result = await provider.getTokenExpirationTimestamp('token');

      expect(result).toBeNull();
    });

    it('should return expiration time in milliseconds', async () => {
      jwtService.decode.mockReturnValueOnce({ exp: 1_700_000_000 });

      const result = await provider.getTokenExpirationTimestamp('token');

      expect(result).toBe(1_700_000_000_000);
    });
  });

  describe('extractSessionIdFromToken', () => {
    it('should return session id when token is valid', () => {
      jwtService.decode.mockReturnValueOnce({ sid: 'session-1' });

      const result = provider.extractSessionIdFromToken('token');

      expect(result).toBe('session-1');
    });

    it('should throw when token is invalid', () => {
      jwtService.decode.mockReturnValueOnce(null);

      expect(() => provider.extractSessionIdFromToken('token')).toThrow(
        'Invalid token: session ID not found',
      );
    });

    it('should throw when session id is missing', () => {
      jwtService.decode.mockReturnValueOnce({ sub: 'user-1' });

      expect(() => provider.extractSessionIdFromToken('token')).toThrow(
        'Invalid token: session ID not found',
      );
    });
  });
});
