import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import authConfig from '@config/auth.config';
import { AuthStrategy } from '@enums/auth-strategy.enum';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { JwtPayload } from '@interfaces/jwt-payload';

import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  AuthStrategy.JWT_REFRESH,
) {
  constructor(
    private readonly authService: AuthService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.[CookieKeys.RefreshToken],
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload): Promise<any> {
    const refreshToken = request.cookies?.[CookieKeys.RefreshToken];

    return await this.authService.validateRefreshToken(
      payload.sid,
      refreshToken,
    );
  }
}
