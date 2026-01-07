import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtPayload } from '@interfaces/jwt-payload';
import { HashingService } from '@modules/security/services/hashing.service';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';

import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up-dto';
import { TokenPair } from './interfaces/token-pair';
import { JwtTokenProvider } from './providers/jwt-token.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtTokenProvider: JwtTokenProvider,
    private readonly hashingService: HashingService,
  ) {}

  async signIn(signInDto: SignInDto): Promise<TokenPair> {
    const user = await this.usersService.findUniqueOrThrow(
      {
        email: signInDto.email,
      },
      { password: false },
    );

    const isPasswordValid = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken =
      await this.jwtTokenProvider.generateAccessToken(payload);

    const response: TokenPair = {
      accessToken,
      refreshToken: 'dummy-refresh-token',
    };

    return response;
  }

  async signUp(signUpDto: SignUpDto): Promise<void> {
    await this.usersService.create(signUpDto);
  }

  async validateUser(payload: JwtPayload): Promise<UserEntity | null> {
    return this.usersService.findOneById(payload.sub);
  }
}
