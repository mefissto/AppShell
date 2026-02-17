import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import appConfig from '@config/app.config';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { EnvironmentModes } from '@interfaces/environment-variables';
import { LoggerService } from '@loggers/app/logger.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { HashingService } from '@modules/security/services/hashing.service';
import { SessionsService } from '@modules/security/services/sessions.service';
import { UsersService } from '@modules/users/users.service';

import { AuthService } from './auth.service';
import { JwtTokenProvider } from './providers/jwt-token.provider';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let sessionsService: {
    create: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
  };
  let jwtTokenProvider: {
    extractSessionIdFromToken: jest.Mock;
    generateTokenPair: jest.Mock;
    getTokenExpirationTimestamp: jest.Mock;
  };
  let hashingService: {
    hash: jest.Mock;
    generateRandomHash: jest.Mock;
    compare: jest.Mock;
  };
  let notificationsService: { sendEmailVerificationEmail: jest.Mock };
  let loggerService: { setContext: jest.Mock; warn: jest.Mock };
  let mockAppConfig: {
    emailVerificationTokenTtl: number;
    emailVerificationUrl: string;
    env: EnvironmentModes;
  };

  const mockUser = () => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockResponse = (): Response =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as Response;

  const mockRequest = (refreshToken = 'refresh-token'): Request =>
    ({
      cookies: { [CookieKeys.RefreshToken]: refreshToken },
    }) as unknown as Request;

  beforeEach(async () => {
    usersService = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    sessionsService = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };
    jwtTokenProvider = {
      extractSessionIdFromToken: jest.fn(),
      generateTokenPair: jest.fn(),
      getTokenExpirationTimestamp: jest.fn(),
    };
    hashingService = {
      hash: jest.fn(),
      generateRandomHash: jest.fn(),
      compare: jest.fn(),
    };
    notificationsService = { sendEmailVerificationEmail: jest.fn() };
    loggerService = { setContext: jest.fn(), warn: jest.fn() };
    mockAppConfig = {
      emailVerificationTokenTtl: 3600,
      emailVerificationUrl: 'http://example.com/verify',
      env: EnvironmentModes.TEST,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: SessionsService, useValue: sessionsService },
        { provide: JwtTokenProvider, useValue: jwtTokenProvider },
        { provide: HashingService, useValue: hashingService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: LoggerService, useValue: loggerService },
        { provide: appConfig.KEY, useValue: mockAppConfig },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('signIn', () => {
    it('should create a session and set cookies', async () => {
      const user = mockUser();
      const response = mockResponse();
      sessionsService.create.mockResolvedValueOnce({ id: 'session-1' });
      jwtTokenProvider.generateTokenPair.mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      jwtTokenProvider.getTokenExpirationTimestamp
        .mockResolvedValueOnce(1_700_000_000_000)
        .mockResolvedValueOnce(1_700_000_100_000);
      hashingService.hash.mockResolvedValueOnce('hashed-refresh');
      sessionsService.update.mockResolvedValueOnce({});

      await authService.signIn(user, response);

      expect(sessionsService.create).toHaveBeenCalledWith({
        user: { connect: { id: user.id } },
      });
      expect(jwtTokenProvider.generateTokenPair).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        sid: 'session-1',
      });
      expect(sessionsService.update).toHaveBeenCalledWith('session-1', {
        refreshToken: 'hashed-refresh',
        expiresAt: expect.any(Date),
      });
      expect(response.cookie).toHaveBeenCalledTimes(2);
    });

    it('should throw when token expiration timestamps are missing', async () => {
      const user = mockUser();
      const response = mockResponse();
      sessionsService.create.mockResolvedValueOnce({ id: 'session-1' });
      jwtTokenProvider.generateTokenPair.mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      jwtTokenProvider.getTokenExpirationTimestamp.mockResolvedValueOnce(null);

      await expect(authService.signIn(user, response)).rejects.toThrow(
        'Failed to get token expiration timestamps',
      );
    });
  });

  describe('signUp', () => {
    it('should send verification email and create user', async () => {
      const signUpDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
      };
      hashingService.generateRandomHash.mockReturnValueOnce('raw-token');
      hashingService.hash.mockResolvedValueOnce('hashed-token');
      notificationsService.sendEmailVerificationEmail.mockResolvedValueOnce(
        undefined,
      );
      usersService.create.mockResolvedValueOnce(undefined);

      await authService.signUp(signUpDto);

      expect(hashingService.generateRandomHash).toHaveBeenCalled();
      expect(
        notificationsService.sendEmailVerificationEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: signUpDto.email,
          subject: 'Verify Your Email Address',
          data: expect.objectContaining({
            userName: signUpDto.name,
            verificationLink: expect.stringContaining('token=raw-token'),
          }),
        }),
      );
      expect(usersService.create).toHaveBeenCalledWith(signUpDto, {
        emailVerificationToken: 'hashed-token',
        emailVerificationTokenExpiresAt: expect.any(Date),
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email when token is valid', async () => {
      const user = {
        ...mockUser(),
        emailVerificationToken: 'hashed-token',
        emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
      };
      usersService.findUnique.mockResolvedValueOnce(user);
      hashingService.compare.mockResolvedValueOnce(true);
      usersService.update.mockResolvedValueOnce(undefined);

      await authService.verifyEmail({
        email: user.email,
        token: 'raw-token',
      });

      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      });
    });

    it('should throw when token is invalid', async () => {
      const user = {
        ...mockUser(),
        emailVerificationToken: 'hashed-token',
        emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
      };
      usersService.findUnique.mockResolvedValueOnce(user);
      hashingService.compare.mockResolvedValueOnce(false);

      await expect(
        authService.verifyEmail({ email: user.email, token: 'raw-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when user does not exist', async () => {
      usersService.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.verifyEmail({ email: 'nope@example.com', token: 't' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens and set cookies', async () => {
      const user = mockUser();
      const response = mockResponse();
      const request = mockRequest('refresh-token');
      jwtTokenProvider.extractSessionIdFromToken.mockReturnValueOnce(
        'session-1',
      );
      jwtTokenProvider.generateTokenPair.mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      jwtTokenProvider.getTokenExpirationTimestamp
        .mockResolvedValueOnce(1_700_000_000_000)
        .mockResolvedValueOnce(1_700_000_100_000);
      hashingService.hash.mockResolvedValueOnce('hashed-refresh');
      sessionsService.update.mockResolvedValueOnce({});

      await authService.refreshTokens(user, request, response);

      expect(jwtTokenProvider.extractSessionIdFromToken).toHaveBeenCalledWith(
        'refresh-token',
      );
      expect(response.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('should revoke session and clear cookies', async () => {
      const response = mockResponse();
      const request = mockRequest('refresh-token');
      jwtTokenProvider.extractSessionIdFromToken.mockReturnValueOnce(
        'session-1',
      );
      sessionsService.update.mockResolvedValueOnce({});

      await authService.logout(request, response);

      expect(sessionsService.update).toHaveBeenCalledWith('session-1', {
        revokedAt: expect.any(Date),
      });
      expect(response.clearCookie).toHaveBeenCalledWith(
        CookieKeys.Authentication,
      );
      expect(response.clearCookie).toHaveBeenCalledWith(
        CookieKeys.RefreshToken,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const user = { ...mockUser(), password: 'hashed' };
      usersService.findUnique.mockResolvedValueOnce(user);
      hashingService.compare.mockResolvedValueOnce(true);

      const result = await authService.validateUser({
        email: user.email,
        password: 'plain',
      });

      expect(usersService.findUnique).toHaveBeenCalledWith(
        { email: user.email },
        { password: false },
      );
      expect(result).toEqual(user);
    });

    it('should throw when user is missing', async () => {
      usersService.findUnique.mockResolvedValueOnce(null);

      await expect(
        authService.validateUser({ email: 'nope', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(loggerService.warn).toHaveBeenCalled();
    });

    it('should throw when password is invalid', async () => {
      const user = { ...mockUser(), password: 'hashed' };
      usersService.findUnique.mockResolvedValueOnce(user);
      hashingService.compare.mockResolvedValueOnce(false);

      await expect(
        authService.validateUser({ email: user.email, password: 'bad' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(loggerService.warn).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return user for valid refresh token', async () => {
      sessionsService.findById.mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'hashed',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      usersService.findUnique.mockResolvedValueOnce(mockUser());
      hashingService.compare.mockResolvedValueOnce(true);

      const result = await authService.validateRefreshToken(
        'session-1',
        'refresh-token',
      );

      expect(result).toEqual(expect.objectContaining({ id: 'user-1' }));
    });

    it('should throw when session is missing', async () => {
      sessionsService.findById.mockResolvedValueOnce(null);

      await expect(
        authService.validateRefreshToken('session-1', 'refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh token is revoked', async () => {
      sessionsService.findById.mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'hashed',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
      });
      usersService.findUnique.mockResolvedValueOnce(mockUser());
      hashingService.compare.mockResolvedValueOnce(true);

      await expect(
        authService.validateRefreshToken('session-1', 'refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh token is expired', async () => {
      sessionsService.findById.mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'hashed',
        expiresAt: new Date(Date.now() - 60_000),
        revokedAt: null,
      });
      usersService.findUnique.mockResolvedValueOnce(mockUser());
      hashingService.compare.mockResolvedValueOnce(true);

      await expect(
        authService.validateRefreshToken('session-1', 'refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh token does not match', async () => {
      sessionsService.findById.mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-1',
        refreshToken: 'hashed',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      });
      usersService.findUnique.mockResolvedValueOnce(mockUser());
      hashingService.compare.mockResolvedValueOnce(false);

      await expect(
        authService.validateRefreshToken('session-1', 'refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
