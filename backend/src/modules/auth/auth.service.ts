import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  login(): string {
    return 'Login successful';
  }

  register(): string {
    return 'Registration successful';
  }
}
