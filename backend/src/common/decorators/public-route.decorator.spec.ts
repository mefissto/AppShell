import 'reflect-metadata';

import { IS_PUBLIC_ROUTE_KEY, PublicRoute } from './public-route.decorator';

class PublicRouteTestController {
  @PublicRoute()
  handler() {
    return true;
  }
}

describe('PublicRoute', () => {
  it('sets the public route metadata on a handler', () => {
    const metadata = Reflect.getMetadata(
      IS_PUBLIC_ROUTE_KEY,
      PublicRouteTestController.prototype.handler,
    );

    expect(metadata).toBe(true);
  });
});
