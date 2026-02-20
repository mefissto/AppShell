import 'reflect-metadata';

import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { CurrentUser } from './current-user.decorator';

class CurrentUserTestController {
  handler(@CurrentUser() user: unknown) {
    return user;
  }
}

describe('CurrentUser', () => {
  it('extracts user from http request context', () => {
    const paramsMetadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      CurrentUserTestController,
      'handler',
    ) as Record<
      string,
      { factory: (data: unknown, ctx: ExecutionContext) => unknown }
    >;

    const paramConfig = Object.values(paramsMetadata)[0];

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', email: 'user@example.com' },
        }),
      }),
    } as unknown as ExecutionContext;

    const value = paramConfig.factory(undefined, context);

    expect(value).toEqual({ id: 'user-1', email: 'user@example.com' });
  });
});
