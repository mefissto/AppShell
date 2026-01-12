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

- **Framework**: [NestJS](https://nestjs.com/) 11.x
- **Language**: TypeScript 5.7.x
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

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm install
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
