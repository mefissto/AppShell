import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Request, Response } from 'express';

import { LoggerService } from '@common/logger/logger.service';
import appConfig from '@config/app.config';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { EnvironmentModes } from '@interfaces/environment-variables';
import { JwtPayload } from '@interfaces/jwt-payload';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { HashingService } from '@modules/security/services/hashing.service';
import { SessionsService } from '@modules/security/services/sessions.service';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';

import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up-dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtTokenProvider } from './providers/jwt-token.provider';

@Injectable()
export class AuthService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtTokenProvider: JwtTokenProvider,
    private readonly hashingService: HashingService,
    private readonly notificationsService: NotificationsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async signIn(user: UserEntity, response: Response): Promise<void> {
    // TODO: Think about max sessions per user and handle accordingly
    const session = await this.sessionsService.create({
      user: { connect: { id: user.id } },
    });

    await this.handleTokensCreation(user, session.id, response);
  }

  async signUp(signUpDto: SignUpDto): Promise<void> {
    const emailVerificationToken = this.hashingService.generateRandomHash();
    const emailVerificationTokenExpiresAt = new Date(
      new Date().getTime() + this.config.emailVerificationTokenTtl,
    );

    await this.notificationsService.sendEmailVerificationEmail({
      to: signUpDto.email,
      subject: 'Verify Your Email Address',
      data: {
        userName: signUpDto.name || signUpDto.email,
        verificationLink: `${this.config.emailVerificationUrl}?token=${emailVerificationToken}&email=${encodeURIComponent(
          signUpDto.email,
        )}`,
      },
    });

    await this.usersService.create(signUpDto, {
      emailVerificationToken: await this.hashingService.hash(
        emailVerificationToken,
      ),
      emailVerificationTokenExpiresAt,
    });
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    // TODO: Think about adding resend verification email functionality with rate limiting

    const user = await this.usersService.findUnique({
      email: verifyEmailDto.email,
    });
    const isTokenValid = await this.validateEmailVerificationToken(
      user,
      verifyEmailDto.token,
    );

    if (!isTokenValid || !user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    });
  }

  async refreshTokens(
    user: UserEntity,
    request: Request,
    response: Response,
  ): Promise<void> {
    const sessionId = this.getSessionIdFromRequest(request);

    await this.handleTokensCreation(user, sessionId, response);
  }

  async logout(request: Request, response: Response): Promise<void> {
    const sessionId = this.getSessionIdFromRequest(request);

    await this.sessionsService.update(sessionId, { revokedAt: new Date() });

    response.clearCookie(CookieKeys.Authentication);
    response.clearCookie(CookieKeys.RefreshToken);
  }

  async resetPassword(): Promise<void> {
    // Implementation for initiating password reset (e.g., send email with token)
    this.logger.warn(
      'Password reset requested - functionality not implemented yet',
    );
    throw new NotImplementedException('Password reset not implemented yet');
  }

  async validateUser(signInDto: SignInDto): Promise<UserEntity | null> {
    const user = await this.usersService.findUnique(
      { email: signInDto.email },
      { password: false },
    );

    if (!user || !user.password) {
      this.logger.warn(
        `Login attempt for non-existent user: ${signInDto.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt for user: ${signInDto.email} (invalid password)`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateRefreshToken(
    sessionId: string,
    refreshToken: string,
  ): Promise<UserEntity | null> {
    const session = await this.sessionsService.findById(sessionId);

    if (!session || !session.refreshToken || !session.expiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findUnique({ id: session.userId });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await this.hashingService.compare(
      refreshToken,
      session.refreshToken,
    );
    const isRefreshTokenRevoked = !!session.revokedAt;
    const isRefreshTokenExpired = new Date() > new Date(session.expiresAt);

    if (
      isRefreshTokenValid &&
      !isRefreshTokenRevoked &&
      !isRefreshTokenExpired
    ) {
      return user;
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  private getSessionIdFromRequest(request: Request): string {
    const refreshToken = request.cookies?.[CookieKeys.RefreshToken];

    return this.jwtTokenProvider.extractSessionIdFromToken(refreshToken);
  }

  private async handleTokensCreation(
    user: UserEntity,
    sessionId: string,
    response: Response,
  ): Promise<void> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sid: sessionId,
    };
    const tokenPair = await this.jwtTokenProvider.generateTokenPair(payload);

    const accessTokenExpirationTimestamp =
      await this.jwtTokenProvider.getTokenExpirationTimestamp(
        tokenPair.accessToken,
      );
    const refreshTokenExpirationTimestamp =
      await this.jwtTokenProvider.getTokenExpirationTimestamp(
        tokenPair.refreshToken,
      );

    if (!accessTokenExpirationTimestamp || !refreshTokenExpirationTimestamp) {
      throw new InternalServerErrorException(
        'Failed to get token expiration timestamps',
      );
    }

    await this.sessionsService.update(sessionId, {
      refreshToken: await this.hashingService.hash(tokenPair.refreshToken),
      expiresAt: new Date(refreshTokenExpirationTimestamp),
    });

    response.cookie(CookieKeys.Authentication, tokenPair.accessToken, {
      // makes the cookie inaccessible to JavaScript on the client side
      httpOnly: true,
      // ensures the cookie is only sent over HTTPS in production
      secure: this.config.env === EnvironmentModes.PRODUCTION,
      expires: new Date(accessTokenExpirationTimestamp),
      // TODO: Consider if 'lax' is more appropriate based on app requirements
      sameSite: 'strict', // helps prevent CSRF attacks by not sending cookies on cross-site requests
    });

    response.cookie(CookieKeys.RefreshToken, tokenPair.refreshToken, {
      // makes the cookie inaccessible to JavaScript on the client side
      httpOnly: true,
      // ensures the cookie is only sent over HTTPS in production
      secure: this.config.env === EnvironmentModes.PRODUCTION,
      expires: new Date(refreshTokenExpirationTimestamp),
      // TODO: Consider if 'lax' is more appropriate based on app requirements
      sameSite: 'strict', // helps prevent CSRF attacks by not sending cookies on cross-site requests
    });
  }

  private async validateEmailVerificationToken(
    user: UserEntity | null,
    token: string,
  ): Promise<boolean> {
    if (
      !user ||
      !user.emailVerificationToken ||
      !user.emailVerificationTokenExpiresAt
    ) {
      return false;
    }

    const isTokenValid = await this.hashingService.compare(
      token,
      user.emailVerificationToken,
    );
    const isTokenExpired =
      user.emailVerificationTokenExpiresAt.getTime() < new Date().getTime();

    return isTokenValid && !isTokenExpired;
  }
}
