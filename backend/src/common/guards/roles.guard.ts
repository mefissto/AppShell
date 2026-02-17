import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { ROLES_KEY } from '@decorators/roles.decorator';
import { UserRoles } from '@enums/user-roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles: UserRoles[] = this.reflector.getAllAndOverride<
      UserRoles[]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles) {
      // If no roles are required, allow access
      return true;
    }

    const request: Request & { user: { role: UserRoles } } = context
      .switchToHttp()
      .getRequest();

    // TODO: Implement actual role checking logic here. This is just a placeholder.
    const userRole = request.user.role; // Assuming the user's role is stored in request.user.role
    const hasRole = requiredRoles.includes(userRole);

    if (!userRole || !hasRole) {
      // If the user has no role or does not have the required role, deny access

      throw new NotFoundException('Resource not found'); // Return 404 to avoid revealing the existence of the resource
    }

    return true;
  }
}
