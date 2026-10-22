import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { App } from 'supertest/types';

import * as helpers from './helpers';

describe('E2E application setup', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    if (app) await helpers.closeTestApp(app);
  });

  it('initializes without registering background jobs that could consume test fixtures', async () => {
    // Arrange: use the same helper as the database and HTTP suites.

    // Act: scheduler discovery normally runs as part of application initialization.
    ({ app } = await helpers.createTestApp());
    const scheduler = app.get(SchedulerRegistry);

    // Assert: disabling cron alone would still leave the outbox interval registered.
    expect(scheduler.getCronJobs().size).toBe(0);
    expect(scheduler.getIntervals()).toEqual([]);
    expect(scheduler.getTimeouts()).toEqual([]);
  });
});
