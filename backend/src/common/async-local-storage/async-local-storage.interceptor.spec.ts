import {
    ArgumentsHost,
    CallHandler,
    ExecutionContext
} from '@nestjs/common';
import { of } from 'rxjs';

import { AsyncLocalStorageInterceptor } from './async-local-storage.interceptor';
import { AsyncLocalStorageService } from './async-local-storage.service';
import { USER_ID_KEY } from './interfaces/async-local-storage';

describe('AsyncLocalStorageInterceptor', () => {
  let alsService: { set: jest.Mock };
  let interceptor: AsyncLocalStorageInterceptor;

  const createExecutionContext = (request: unknown): ExecutionContext =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      } as unknown as ArgumentsHost),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    alsService = {
      set: jest.fn(),
    };
    interceptor = new AsyncLocalStorageInterceptor(
      alsService as unknown as AsyncLocalStorageService,
    );
  });

  it('should set user id in async local storage and call next handler', (done) => {
    const request = { user: { id: 'user-1' } };
    const context = createExecutionContext(request);
    const expected$ = of('ok');
    const next = {
      handle: jest.fn().mockReturnValue(expected$),
    } as unknown as CallHandler;

    const result$ = interceptor.intercept(context, next);

    expect(alsService.set).toHaveBeenCalledWith(USER_ID_KEY, 'user-1');
    expect(next.handle).toHaveBeenCalled();

    result$.subscribe((value) => {
      expect(value).toBe('ok');
      done();
    });
  });

  it('should set undefined user id when request has no user', () => {
    const request = {};
    const context = createExecutionContext(request);
    const next = {
      handle: jest.fn().mockReturnValue(of('ok')),
    } as unknown as CallHandler;

    interceptor.intercept(context, next);

    expect(alsService.set).toHaveBeenCalledWith(USER_ID_KEY, undefined);
    expect(next.handle).toHaveBeenCalled();
  });
});
