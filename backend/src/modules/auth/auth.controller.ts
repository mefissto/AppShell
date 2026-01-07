import { Body, Controller, Post } from '@nestjs/common';

import { PublicRoute } from '@decorators/public-route.decorator';
import { ApiRoutes } from '@enums/api-routes';

import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up-dto';
import { TokenPair } from './interfaces/token-pair';

@PublicRoute()
@Controller(ApiRoutes.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  signIn(@Body() signInDto: SignInDto): Promise<TokenPair> {
    return this.authService.signIn(signInDto);
  }

  @Post('register')
  signUp(@Body() signUpDto: SignUpDto): Promise<void> {
    return this.authService.signUp(signUpDto);
  }
}
