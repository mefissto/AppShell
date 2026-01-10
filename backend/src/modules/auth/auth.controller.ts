import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { CurrentUser } from '@decorators/current-user.decorator';
import { PublicRoute } from '@decorators/public-route.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { JwtRefreshAuthGuard } from '@guards/jwt-refresh-auth.guard';
import { LocalAuthGuard } from '@guards/local-auth.guard';
import { UserEntity } from '@modules/users/entities/user.entity';

import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up-dto';

@PublicRoute()
@Controller(ApiRoutes.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async signIn(
    @CurrentUser() user: UserEntity,
    // passthrough option allows us to use the response object without taking over the response handling
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.signIn(user, response);
  }

  @Post('register')
  signUp(@Body() signUpDto: SignUpDto): Promise<void> {
    return this.authService.signUp(signUpDto);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  async refreshToken(
    @CurrentUser() user: UserEntity,
    // passthrough option allows us to use the response object without taking over the response handling
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.refreshTokens(user, request, response);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.logout(request, response);
  }
}
