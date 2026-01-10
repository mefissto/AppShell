import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthStrategy } from '@enums/auth-strategy.enum';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard(AuthStrategy.JWT_REFRESH) {}
