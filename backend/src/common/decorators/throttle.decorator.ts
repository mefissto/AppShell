import { Throttle } from '@nestjs/throttler';

export const StrictAuthThrottle = () =>
  Throttle({ default: { limit: 3, ttl: 3600000 } }); // 3 requests per hour

export const AuthThrottle = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } }); // 5 requests per minute

export const PublicThrottle = () =>
  Throttle({ default: { limit: 200, ttl: 60000 } }); // 200 requests per minute
