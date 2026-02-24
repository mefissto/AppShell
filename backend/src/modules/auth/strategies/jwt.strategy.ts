import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import authConfig from '@config/auth.config';
import { AuthStrategy } from '@enums/auth-strategy.enum';
import { CookieKeys } from '@enums/cookie-keys.enum';
import { JwtPayload } from '@interfaces/jwt-payload';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AuthStrategy.JWT) {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request.cookies?.[CookieKeys.Authentication],
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity | null> {
    return await this.usersService.findUnique({ id: payload.sub });
  }
}
