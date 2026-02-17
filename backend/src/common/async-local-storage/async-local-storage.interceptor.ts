import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequestWithUser } from '@interfaces/request-with-user';
import { AsyncLocalStorageService } from './async-local-storage.service';
import { USER_ID_KEY } from './interfaces/async-local-storage';

@Injectable()
export class AsyncLocalStorageInterceptor implements NestInterceptor {
  constructor(private readonly alsService: AsyncLocalStorageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    this.alsService.set(USER_ID_KEY, request.user?.id);

    return next.handle();
  }
}
