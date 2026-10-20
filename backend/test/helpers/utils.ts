import { ThrottlerStorageService } from '@nestjs/throttler';

export function resetTestThrottler(storage: ThrottlerStorageService): void {
  storage.onApplicationShutdown();
}
    