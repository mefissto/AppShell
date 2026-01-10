import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import jwtConfig from '@config/jwt.config';
import { JwtPayload } from '@interfaces/jwt-payload';

import { TokenPair } from '../interfaces/token-pair';

@Injectable()
export class JwtTokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.refreshSecret,
      expiresIn: this.config.refreshTokenTtl,
    });
  }

  /* Returns expiration timestamp in milliseconds */
  async getTokenExpirationTimestamp(token: string): Promise<number | null> {
    const decoded: JwtPayload | null = this.jwtService.decode(token);

    if (!decoded || !decoded.exp) {
      return null;
    }

    return decoded.exp * 1000;
  }

  extractSessionIdFromToken(token: string): string {
    const decoded: JwtPayload | null = this.jwtService.decode(token);
    if (!decoded || !decoded.sid) {
      throw new Error('Invalid token: session ID not found');
    }

    return decoded.sid;
  }
}
