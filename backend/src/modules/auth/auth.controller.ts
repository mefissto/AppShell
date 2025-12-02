import { Controller, Get } from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  login(): string {
    return this.authService.login();
  }

  @Get('register')
  register(): string {
    return this.authService.register();
  }
}
