import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtPayload } from '@interfaces/jwt-payload';

@Injectable()
export class JwtTokenProvider {
  constructor(private readonly jwtService: JwtService) {}

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
