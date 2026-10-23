# Backend E2E tests

Run `npm run test:e2e` from `backend`. The pretest script applies migrations to the database configured in `.env.e2e`.

These suites share one PostgreSQL database. The Jest configuration uses `maxWorkers: 1` because outbox claims and reminder processing scan globally eligible records. Unique recipient and user fixtures do not isolate those scans: parallel suites can consume each other's records. Run only one E2E invocation against this database at a time; do not override the worker limit without giving each worker an isolated database or schema.

Concurrency within a test is intentional. The outbox and reminder concurrency tests still issue simultaneous operations with `Promise.all` to verify PostgreSQL locking and ownership behavior.

The application helper disables scheduler discovery before initialization, so cron jobs, intervals, and timeouts cannot process fixtures in the background. Scheduled handlers are tested directly by unit tests. The helper also replaces the email sender so no tests contact Resend.

Cleanup removes only records owned by each test, including outbox rows that have no user foreign key. Avoid truncating shared tables to hide leaked fixtures.

The reminder rollback test deliberately causes PostgreSQL `P0001` errors with messages such as `Simulated notification insert failure` and `Simulated email outbox insert failure`. Those application error logs are expected; the Jest summary determines whether the rollback assertions passed.
