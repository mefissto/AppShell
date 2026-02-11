import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    signIn: jest.Mock;
    signUp: jest.Mock;
    verifyEmail: jest.Mock;
    refreshTokens: jest.Mock;
    logout: jest.Mock;
  };

  const mockUser = () => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockRequest = (): Request =>
    ({
      headers: {},
      cookies: {},
    }) as unknown as Request;

  const mockResponse = (): Response =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as Response;

  beforeEach(async () => {
    authService = {
      signIn: jest.fn(),
      signUp: jest.fn(),
      verifyEmail: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should sign in and set cookies', async () => {
      const user = mockUser();
      const response = mockResponse();
      authService.signIn.mockResolvedValueOnce(undefined);

      await controller.signIn(user, response);

      expect(authService.signIn).toHaveBeenCalledWith(user, response);
    });

    it('should propagate errors from authService', async () => {
      const user = mockUser();
      const response = mockResponse();
      authService.signIn.mockRejectedValueOnce(new Error('Invalid'));

      await expect(controller.signIn(user, response)).rejects.toThrow(
        'Invalid',
      );
      expect(authService.signIn).toHaveBeenCalledWith(user, response);
    });
  });

  describe('signUp', () => {
    it('should register a user', async () => {
      const signUpDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
      };
      authService.signUp.mockResolvedValueOnce(undefined);

      await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
    });

    it('should propagate errors from authService', async () => {
      const signUpDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongP@ssw0rd!',
      };
      authService.signUp.mockRejectedValueOnce(
        new Error('Registration failed'),
      );

      await expect(controller.signUp(signUpDto)).rejects.toThrow(
        'Registration failed',
      );
      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const verifyEmailDto = {
        email: 'test@example.com',
        token: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      };
      authService.verifyEmail.mockResolvedValueOnce(undefined);

      await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto);
    });

    it('should propagate errors from authService', async () => {
      const verifyEmailDto = {
        email: 'test@example.com',
        token: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      };
      authService.verifyEmail.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(
        'Invalid token',
      );
      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto);
    });
  });

  describe('resetPassword', () => {
    it('should return void', () => {
      expect(controller.resetPassword()).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens and set cookies', async () => {
      const user = mockUser();
      const request = mockRequest();
      const response = mockResponse();
      authService.refreshTokens.mockResolvedValueOnce(undefined);

      await controller.refreshToken(user, request, response);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        user,
        request,
        response,
      );
    });

    it('should propagate errors from authService', async () => {
      const user = mockUser();
      const request = mockRequest();
      const response = mockResponse();
      authService.refreshTokens.mockRejectedValueOnce(
        new Error('Unauthorized'),
      );

      await expect(
        controller.refreshToken(user, request, response),
      ).rejects.toThrow('Unauthorized');
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        user,
        request,
        response,
      );
    });
  });

  describe('logout', () => {
    it('should log out and clear cookies', async () => {
      const request = mockRequest();
      const response = mockResponse();
      authService.logout.mockResolvedValueOnce(undefined);

      await controller.logout(request, response);

      expect(authService.logout).toHaveBeenCalledWith(request, response);
    });

    it('should propagate errors from authService', async () => {
      const request = mockRequest();
      const response = mockResponse();
      authService.logout.mockRejectedValueOnce(new Error('Logout failed'));

      await expect(controller.logout(request, response)).rejects.toThrow(
        'Logout failed',
      );
      expect(authService.logout).toHaveBeenCalledWith(request, response);
    });
  });
});
