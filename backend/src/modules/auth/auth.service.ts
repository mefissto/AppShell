import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Request, Response } from 'express';

import appConfig from '@config/app.config';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { EnvironmentModes } from '@interfaces/environment-variables';
import { JwtPayload } from '@interfaces/jwt-payload';
import { HashingService } from '@modules/security/services/hashing.service';
import { SessionsService } from '@modules/security/services/sessions.service';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';

import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up-dto';
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
  ) {}

  async signIn(user: UserEntity, response: Response): Promise<void> {
    // TODO: Think about max sessions per user and handle accordingly
    const session = await this.sessionsService.create({
      user: { connect: { id: user.id } },
    });

    await this.handleTokensCreation(user, session.id, response);
  }

  async signUp(signUpDto: SignUpDto): Promise<void> {
    await this.usersService.create(signUpDto);
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

  async validateUser(signInDto: SignInDto): Promise<UserEntity | null> {
    const user = await this.usersService.findUnique(
      { email: signInDto.email },
      { password: false },
    );

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
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
}
