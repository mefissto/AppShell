import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '@decorators/current-user.decorator';
import { PublicRoute } from '@decorators/public-route.decorator';
import { ApiRoutes } from '@enums/api-routes';
import { JwtRefreshAuthGuard } from '@guards/jwt-refresh-auth.guard';
import { LocalAuthGuard } from '@guards/local-auth.guard';
import { UserEntity } from '@modules/users/entities/user.entity';

import {
  AuthThrottle,
  StrictAuthThrottle,
} from '@decorators/throttle.decorator';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up-dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@PublicRoute()
@AuthThrottle()
@ApiTags('Auth')
@Controller(ApiRoutes.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: SignInDto })
  @ApiOperation({
    summary: 'User login',
    description: 'Validates credentials and sets authentication cookies.',
  })
  @ApiOkResponse({
    description: 'Login successful. Authentication cookies set.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  async signIn(
    @CurrentUser() user: UserEntity,
    // passthrough option allows us to use the response object without taking over the response handling
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.signIn(user, response);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiCreatedResponse({ description: 'User registered successfully.' })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  signUp(@Body() signUpDto: SignUpDto): Promise<void> {
    return this.authService.signUp(signUpDto);
  }

  @Post('verify-email')
  @StrictAuthThrottle()
  @ApiOperation({ summary: 'Verify email address' })
  @ApiOkResponse({ description: 'Email verified successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification token.',
  })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('reset-password')
  @StrictAuthThrottle()
  @ApiOperation({ summary: 'Request password reset' })
  @ApiOkResponse({ description: 'Reset process initiated.' })
  resetPassword(): void {}

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  @ApiCookieAuth('RefreshToken')
  @ApiOperation({ summary: 'Refresh authentication tokens' })
  @ApiOkResponse({ description: 'Tokens refreshed. Cookies updated.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token.' })
  async refreshToken(
    @CurrentUser() user: UserEntity,
    // passthrough option allows us to use the response object without taking over the response handling
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.refreshTokens(user, request, response);
  }

  @Delete('logout')
  @ApiCookieAuth('Authentication')
  @ApiOperation({ summary: 'Logout user' })
  @ApiOkResponse({ description: 'Logged out. Cookies cleared.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.authService.logout(request, response);
  }
}
