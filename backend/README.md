# AppShell Backend

A full-featured NestJS backend application with authentication, task management, and user management.

## Overview

This is a production-ready NestJS backend that provides:

- **Authentication** - JWT-based authentication with refresh tokens and local strategy
- **User Management** - User registration, profiles, and email verification
- **Task Management** - Create, update, and manage tasks with status tracking
- **Session Management** - Secure session handling with device tracking
- **Security** - Helmet, CORS, input validation, throttling, and role-based access control
- **Database** - PostgreSQL with Prisma ORM
- **API Documentation** - Swagger/OpenAPI integration

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) 12.x
- **Language**: TypeScript 6.0.x
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io/)
- **Authentication**: JWT + Passport.js
- **Validation**: class-validator, class-transformer
- **Security**: Helmet, bcrypt
- **API Docs**: Swagger
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier

## Project Structure

```
src/
├── app.module.ts           # Root module
├── main.ts                 # Application entry point
├── common/                 # Shared utilities and decorators
│   ├── constants/          # Application constants
│   ├── decorators/         # Custom decorators (auth, throttle, etc.)
│   ├── entities/           # Base entities
│   ├── enums/              # API routes and auth enums
│   ├── filters/            # Exception filters
│   ├── guards/             # Auth guards (JWT, local, refresh)
│   ├── interfaces/         # TypeScript interfaces
│   └── utils/              # Helper utilities
├── config/                 # Configuration modules
│   ├── app.config.ts       # App configuration
│   ├── database.config.ts  # Database configuration
│   ├── jwt.config.ts       # JWT configuration
│   ├── cors.config.ts      # CORS configuration
│   └── swagger.config.ts   # API documentation config
├── database/               # Database service and migrations
│   └── prisma.service.ts   # Prisma client wrapper
└── modules/                # Feature modules
    ├── auth/               # Authentication (login, signup, refresh)
    ├── users/              # User management
    ├── tasks/              # Task management
    ├── notifications/      # Notifications service
    └── security/           # Security features

prisma/
├── schema.prisma           # Data models
└── migrations/             # Database migrations
```

## Data Models

### User
- ID, email, password (hashed)
- Name, email verification status
- Timestamps (created, updated)
- Relations: Sessions, Tasks

### Session
- ID, refresh token
- Device info (IP, user agent, device name)
- Expiration and revocation tracking
- Timestamps and user relation

### Task
- ID, title, description
- Status (PENDING, IN_PROGRESS, COMPLETED)
- User association
- Timestamps

## Getting Started

### Docker development

The backend image generates its own Prisma client after copying the build context.
Host-generated files are excluded from Compose Watch so they cannot replace the
container's generated package entry point during watch synchronization.

After pulling changes to the Dockerfile or Prisma generation helper, rebuild and
recreate the backend from this directory:

```bash
docker compose up --build --force-recreate --no-deps backend
```

This assumes the database is already running and its migrations have completed.
For the normal full-stack startup, use `docker compose up --build --wait`.
After changing the Prisma schema, rebuild the backend image as well; source-only
watch synchronization does not regenerate the client.

### Prerequisites

- Node.js **24.22.0**, matching CI and the Docker images. The supported range is
  `>=24.15.0 <25`; `backend/.nvmrc` records the preferred version.
- npm **>=11.14.1 <12**. Use npm and the committed `package-lock.json` for this project.
- PostgreSQL database

From `backend`, run `nvm install` and `nvm use` if your version manager supports
`.nvmrc`. With nvm-windows, use `nvm install 24.22.0` followed by
`nvm use 24.22.0` explicitly. Check `node --version` and `npm --version` afterward.
In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

### Installation

1. Install the exact locked dependencies from the `backend` directory:
```bash
npm ci
```

2. Configure environment variables by creating a `.env` file:
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/appshell
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800
THROTTLE_LIMIT=10
THROTTLE_TTL=60
```

3. Set up the database:
```bash
npx prisma migrate dev
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

## Running the Application

### Development

```bash
npm run start:dev
```

The application starts on the configured port (default: 3000) with hot-reload enabled.

### Production

```bash
npm run build
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## API Documentation

Once the application is running, access Swagger UI at:
```
http://localhost:3000/api/docs
```

## Testing

### Unit Tests

```bash
npm run test
```

### Test with Coverage

```bash
npm run test:cov
```

### E2E Tests

```bash
npm run test:e2e
```

### Watch Mode

```bash
npm run test:watch
```

## Code Quality

### Linting

```bash
npm run lint
```

### Code Formatting

```bash
npm run format
```

## Database Management

### Database Seeding

Run the following commands from `backend` after installing dependencies, applying
migrations, and generating the Prisma client as described above. Prisma runs
`prisma/seeds/seed.ts` through the seed command in `prisma.config.ts`.

**Environment and safety**

Seeding is allowed only with `APP_ENV=development` or `APP_ENV=e2e`; `NODE_ENV`
alone does not enable it. The npm scripts below set `APP_ENV` for you. The Prisma
environment loader reads `.env`, then `.env.<APP_ENV>` with overrides, then
`ENV_FILE` (if set) with overrides. Check the effective `DATABASE_URL` before
running either workflow: the environment guard does not verify that the URL
points to a development or test database. Use a local or disposable database,
never production, and reserve the performance accounts for generated test data.

**Development seed**

Use this for everyday development and functional testing. It defines five users,
five projects, and ten tasks in `prisma/seeds/seed-data.ts`. Stable IDs and Prisma
`upsert` operations with empty updates make it non-destructive and repeatable:
missing records are created, while existing records and your edits are preserved.
All development seed operations run in one transaction.

```bash
npm run prisma:seed:dev -- -- --seedType default
```

For the e2e database, use `npm run prisma:seed:e2e -- -- --seedType default`.
The first `--` forwards npm arguments; the second tells Prisma to pass the seed
arguments to the configured script. `--seedType` is required, even for development.

**Performance seed**

Use this for larger datasets when checking task queries, pagination, or load.
There is no dedicated performance npm script; select it through the same runner:

```bash
npm run prisma:seed:dev -- -- --seedType performance --taskTotalCount 20000 --taskBatchSize 1000
```

Replace `20000` and `1000` to customize the total task count and batch size; both
must be positive safe integers. The current implementation has **no defaults**
for either argument, so both are required. The command above explicitly requests
20,000 tasks in batches of 1,000; it is an example, not a verified load benchmark.
Use `prisma:seed:e2e` instead of `prisma:seed:dev` to target the e2e environment.

The seed ensures five users with `performance-` prefixed IDs and emails, then
creates five projects per user (25 total) and the requested number of tasks.
Projects use `performance_project_...` IDs and tasks use `performance_task_...`
IDs. Task values follow index-based patterns with stable IDs, cycling statuses
and priorities; due dates alternate between `2026-11-30T00:00:00.000Z` and no date.

**Warning: performance seeding deletes and regenerates existing performance
data.** It keeps the five performance users through non-updating upserts, but
deletes all tasks, owned projects, tags, notifications, task reminders, and related
task-reminder email outbox entries for those users, including manually added data.
Ordinary development users, projects, and tasks are outside the cleanup filters.
Cleanup runs in a transaction; project creation and separate task batch inserts
follow afterward. The full workflow is not atomic: an insertion failure can leave
a partially regenerated dataset. Rerun with the same arguments to regenerate it.

**Docker `db-seed` service**

`compose.yaml` includes an optional service invoked with
`docker compose --profile seed run --rm db-seed`. It uses the existing
`appshell/backend:latest` image, waits for a healthy database, and passes
`DATABASE_URL` and `APP_ENV` from Compose. It does not run during normal stack
startup, wait for migrations, or restart automatically; prepare the image and
apply migrations first.

The service currently invokes `npm run prisma:seed`, whose package script is
the literal `2`, so **this Docker command cannot currently seed the database**.
It also supplies no required `--seedType`. This service is not a configured
performance seed workflow; use the explicit npm commands above.

**Verify the result**

Check the logged environment and loaded files, task batch progress (performance
only), and final `Database seeded successfully!` message. Open Prisma Studio
using the command below with the same `APP_ENV`, `ENV_FILE` (if used), and database
configuration as the seed. For development, inspect the predefined IDs such as
`john.doe-1`, `project-one-1`, and `task-one-1`; rerunning should preserve edits.
For performance, filter by the five performance user IDs and confirm 25 owned
projects and the requested total task count (20,000 for the example), rather than
counting all rows in a database that may also contain development data.

### View Data with Prisma Studio

```bash
npx prisma studio
```

### Create Migration

```bash
npx prisma migrate dev --name migration_name
```

### Reset Database

```bash
npx prisma migrate reset
```

### Generate Prisma Client

```bash
npm run prisma:generate
```

## Key Features

### Authentication
- Local strategy (username/password)
- JWT bearer tokens with automatic refresh
- Secure cookie-based session storage
- Token expiration and revocation

### Authorization
- JWT-based route protection
- Public route decorator for open endpoints
- Custom decorators for accessing current user

### Rate Limiting
- Global throttling with configurable limits
- Per-route throttle overrides
- Different strategies for auth routes

### Validation
- Automatic DTO validation
- Whitelist enforcement
- Class-based transformers
- Comprehensive error messages

### Security
- Helmet for HTTP headers
- CORS configuration
- Password hashing with bcrypt
- Input sanitization
- Exception handling for database errors

### Notifications
- Email notifications via Resend
- Async notification queue

## Configuration

All configuration is managed through:
- Environment variables (`.env` file)
- Configuration modules in `src/config/`
- Runtime configuration via `@nestjs/config`

## Error Handling

The application includes:
- Global exception filter for Prisma errors
- Standardized error response format
- Detailed error logging
- HTTP status code mapping

## Development Guidelines

- Follow the modular structure for new features
- Create DTOs for request validation
- Use decorators for cross-cutting concerns
- Implement services for business logic
- Add tests for all public methods
- Use dependency injection throughout

## License

UNLICENSED
