import { Throttle } from '@nestjs/throttler';

import {
  AuthThrottle,
  PublicThrottle,
  StrictAuthThrottle,
} from './throttle.decorator';

jest.mock('@nestjs/throttler', () => ({
  Throttle: jest.fn(),
}));

describe('Throttle decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses strict auth throttle settings', () => {
    StrictAuthThrottle();

    expect(Throttle).toHaveBeenCalledWith({
      default: { limit: 3, ttl: 3600000 },
    });
  });

  it('uses auth throttle settings', () => {
    AuthThrottle();

    expect(Throttle).toHaveBeenCalledWith({
      default: { limit: 5, ttl: 60000 },
    });
  });

  it('uses public throttle settings', () => {
    PublicThrottle();

    expect(Throttle).toHaveBeenCalledWith({
      default: { limit: 200, ttl: 60000 },
    });
  });
});
