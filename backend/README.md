# Backend developer guide

The repository overview, verified feature list, architecture, and project status are in the [root README](../README.md). This guide covers backend-specific setup and development commands.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts`, `src/app.module.ts` | Application bootstrap and module composition |
| `src/modules/` | Feature modules for auth, users, tasks, projects, tags, account preferences, notifications, security, and scheduling |
| `src/common/` | Shared guards, decorators, validation, pagination, logging, filters, and utilities |
| `src/config/` | Typed application configuration and environment validation |
| `src/database/` | Prisma service and database module |
| `src/system/health/` | Liveness and readiness endpoints |
| `prisma/` | Prisma schema, migrations, and seed configuration |
| `test/` | End-to-end tests and test helpers |

Feature modules generally expose controllers for HTTP routes and services for application operations. The shared database module supplies Prisma access.

## Environment setup

Follow the setup steps in the root README. The application chooses `.env.<APP_ENV>` at runtime; the development scripts set `APP_ENV=development`. Production ignores environment files and reads configuration from the process environment.

Nest configuration validates required values against a Joi schema. In `.env`, use `database` as the PostgreSQL hostname for Compose; for a backend running on the host, use `localhost` in `.env.development`. The E2E setup uses `.env.e2e`. Keep these local files out of version control and point E2E tests at a separate test database.

Prisma's config loads `.env`, then the file selected by `APP_ENV`, and optionally the file selected by `ENV_FILE`. The Prisma generation script also runs a repository-specific post-generation script. The Compose migration service uses `prisma migrate deploy` to apply checked-in migrations before starting the backend.

## Testing and quality notes

The root README lists the available test, lint, and build commands. The E2E test pre-hook applies migrations using the database URL in `.env.e2e`; ensure it targets a separate test database before running the suite. The lint script invokes ESLint with `--fix` and may modify source files.

For the CI checks, see the [GitHub Actions workflow](../.github/workflows/test.yml).
