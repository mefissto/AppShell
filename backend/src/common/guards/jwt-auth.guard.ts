import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_ROUTE_KEY } from '@decorators/public-route.decorator';
import { AuthStrategy } from '@enums/auth-strategy.enum';

@Injectable()
export class JwtAuthGuard
  extends AuthGuard(AuthStrategy.JWT)
  implements CanActivate
{
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If the route is marked as public, allow access
    if (isPublic) {
      return true;
    }

    /** Let Passport handle JWT extraction, verification, and validate()
     * It will verify the token using the secret from config
     * And call the validate method in JwtStrategy
     * It will attach the validated user to request.user
     */
    return super.canActivate(context);
  }
}
