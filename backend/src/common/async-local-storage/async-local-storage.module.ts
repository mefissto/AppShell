import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { ClsModule } from 'nestjs-cls';

import { AsyncLocalStorageInterceptor } from './async-local-storage.interceptor';
import { AsyncLocalStorageService } from './async-local-storage.service';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      //* Since in NestJS, HTTP middleware is the first thing to run when a request arrives, it is an ideal place to initialize the CLS context.
      //* By enabling `mount` and `generateId`, the CLS context will be automatically created for each incoming request,
      //* and a unique request ID will be generated and stored in the context. The `idGenerator` function allows us to customize how the request ID is generated,
      //* in this case by using the `x-request-id` header if present or falling back to a random UUID.
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req) => req.headers['x-request-id'] || randomUUID(),
      },
    }),
  ],
  providers: [
    AsyncLocalStorageService,
    //* Register the AsyncLocalStorageInterceptor as a global interceptor to ensure that it runs for every request and sets up the CLS context with the user ID and request ID.
    //* Since the interceptor runs after Guards (JwtAuthGuard in particular) have executed, we can safely access the authenticated user information
    //* from the request object and store it in the CLS context for later retrieval in services and other parts of the application.
    {
      provide: APP_INTERCEPTOR,
      useClass: AsyncLocalStorageInterceptor,
    },
  ],
  exports: [ClsModule, AsyncLocalStorageService],
})
export class AlsModule {}
