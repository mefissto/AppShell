## Replace resend emails with AWS SES

## Deferred work from the migration review

Moved here on 16 October 2026. These are existing application defects, maintenance opportunities, and deployment improvements, not prerequisites for the NestJS 12 / TypeScript 6 migration. Review and schedule them independently. The detailed examples are design guidance, not implemented changes. Priorities and observations reflect the original review; recheck the current code before implementing.

### Review checklist

- [ ] High: verify logout identity and prevent forged session selection.
- [ ] High: use full refresh-token digests, unique jti values, and atomic rotation; decide the existing-session transition.
- [ ] Define access-token revocation, issuer/audience/algorithm checks, and email-verification policy.
- [ ] Triage dependency advisories and schedule unrelated package updates.
- [ ] Correct reminder timing, real delivery state, retries, preferences, and idempotency.
- [ ] Share production/E2E validation setup and fix E2E environment selection; expand database-backed CI separately.
- [ ] Configure browser cookie/CORS and reverse-proxy behavior for the intended deployment.
- [ ] Complete soft-delete semantics and typing.
- [ ] Persist registration state before sending verification email; review resend/password-reset scope.
- [ ] Correct date DTO and task/tag response mapping contracts.
- [ ] Review Prisma lifecycle, database indexes, and project ownership/delete consistency.
- [ ] Correct anonymous/system audit identity and durability.
- [ ] Align Prisma versions/environment precedence and make migration-tool installation reproducible.
- [ ] Add production runtime images, review Postgres port mapping, and update deployment documentation.

### High priority: authentication corrections (former migration Step 2)

**Why:** a framework upgrade should preserve correct authentication behavior. The existing code has defects that are independent of Nest 12, so fix and test them in their own commits. This also gives you meaningful regression checks during the upgrade.

**Files involved:** auth controller/service, JWT provider and strategies, SessionsService, hashing services, the Prisma Session model if storage changes are needed, and auth unit/E2E tests.

**What to do:**

1. Fix logout first. The controller is public, and logout currently extracts sid with JWT `decode()`. Decoding reads a token's contents; it does not prove the token was issued by your app. Verify the refresh token's signature and expected claims, look up its session, and ensure the stored token/session/user agree before revoking it. Use an explicit route guard or a service flow that performs equivalent verification. Define how logout behaves for an already expired or missing cookie, including whether cookies are still cleared.
2. Separate refresh-token storage from password hashing. Keep bcrypt for passwords initially. For a high-entropy refresh token, store a SHA-256 digest or an HMAC of the entire token instead of bcrypt, which ignores bytes after its supported prefix. Put that operation in a clearly named token-specific helper so future callers do not accidentally use password hashing for tokens.
3. Add a unique `jti` claim to every refresh token. This is a random token identifier; it prevents two rotations with otherwise identical payloads issued in the same second from producing the same JWT.
4. Make rotation conditional on the token that was validated. For example, update the session only when its ID, previous token digest, non-revoked state, and expiration match. Treat an update count of zero as a failed refresh. Checking first and then updating without a condition allows two concurrent requests to both use the old token.
5. Decide what happens to existing sessions when token storage changes. For a small project, invalidating sessions and requiring login again may be simpler than supporting both storage formats. If sessions must be preserved, introduce an explicit format/version transition. Record the decision before changing persisted data.
6. Add expected issuer, audience, and signing algorithm checks to both JWT strategies. Choose whether logout must immediately invalidate existing access tokens. If yes, access-token validation must also check the session; if no, document the maximum time until the token expires.
7. Decide whether unverified email addresses may sign in. Enforce that decision explicitly rather than relying on registration emails to imply enforcement.

#### Verify the identity of the session being logged out

**Current flow:** AuthController is marked public. Logout calls AuthService.logout, which reads the refresh cookie, decodes its sid, and updates that session. Anyone can encode a payload containing a sid; the fact that decode succeeds does not authenticate it.

**Desired flow:** extract the refresh cookie, verify its signature and claims with the refresh secret, validate its payload shape, load the referenced session, and check that the session belongs to payload.sub. Compare the presented token with the stored token representation and check expiration/revocation before allowing it to select a session for mutation.

Your existing JwtRefreshAuthGuard/JwtRefreshStrategy can be reused for strict authenticated logout after strengthening their session validation. However, that strategy currently returns only a UserEntity. Return or attach a typed authentication context containing the verified user, session ID, and presented token digest so the service does not decode the raw cookie again. A suggested request-local shape is `{ user, sessionId, refreshTokenDigest }`. Update CurrentUser handling if changing request.user's shape; alternatively keep request.user as the user and attach the context separately.

Choose the endpoint policy explicitly. A simple first implementation is: valid refresh credentials revoke the current session and return 200; invalid credentials return 401 without modifying any session. If you prefer logout to always clear cookies and return 200, implement that as an intentional idempotent flow: invalid credentials may clear browser cookies but must never select a database session for revocation. A guard that rejects before the controller runs will not execute the controller's cookie-clearing code, so these policies need different control flow.

Use matching cookie path/domain options when setting and clearing cookies. Logout should revoke only the selected session; signing out every device would be a separate explicit operation. Prefer a conditional update rather than a generic update-by-id helper.

**Tests:** a valid logout revokes its session; another session stays active; a fabricated JWT containing a real sid cannot revoke it; a missing/malformed/expired cookie follows the chosen response policy without a 500.

#### Give refresh tokens their own storage helper

**Current flow:** handleTokensCreation calls the same HashingService used for passwords. Bcrypt handles only the first 72 bytes, and refresh JWTs are longer than that. Distinct tokens with matching prefixes can therefore match the same bcrypt hash. This limit is documented in the [bcrypt project](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns).

Passwords are human-selected and often guessable, so they need a slow password hash. Signed refresh JWTs contain cryptographic material and can be represented by a fast full-token digest. For this project, a small RefreshTokenDigestService using SHA-256 is a straightforward choice. An HMAC is another choice, but introduces an extra secret and key-rotation policy; it is not necessary merely to avoid bcrypt's prefix truncation.

An illustrative helper is:

```typescript
import { createHash } from 'node:crypto';

function digestRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
```

Hash the exact cookie string. At issuance, persist only its digest; at validation/rotation, calculate the incoming token's digest. A digest does not replace signature verification: first verify the JWT, then check it against the session. Never store or log the raw refresh token.

You can temporarily reuse Session.refreshToken for the digest, but `refreshTokenDigest` is a clearer field name. Renaming requires a Prisma migration and corresponding SessionEntity/input changes. A SHA-256 hex value is 64 characters; check any storage constraints if you change column types. No salt is needed for this token lookup design; unlike salted password hashes, the incoming token must yield the same digest for the conditional database update.

Keep BcryptHashingService for passwords and leave email verification token handling out of this change unless intentionally reviewed. Do not globally replace HashingService with SHA-256.

**Tests:** two long tokens with identical first 72 bytes and different suffixes produce different digests; the same token produces the same digest; persistence never receives the raw JWT; a mismatched digest cannot refresh or revoke a session.

#### Give each refresh JWT a unique jti

**Current flow:** generateRefreshToken signs the user/session payload. JWT timestamps have second-level precision, so signing the same payload twice within a second can produce the same token. Rotation should issue a distinguishable new credential every time.

Add a random identifier when generating each refresh JWT. Keep sid unchanged: sid identifies the login session, while jti identifies one token issued within that session. Add `jti?: string` to the shared payload type, or create a more specific refresh payload type with a required jti. Validate it at runtime too; TypeScript interfaces do not validate incoming JSON.

For example, extend the options in JwtTokenProvider.generateRefreshToken:

```typescript
return this.jwtService.signAsync(payload, {
  secret: this.config.jwtRefreshSecret,
  expiresIn: this.config.refreshTokenTtl,
  jwtid: randomUUID(), // import from node:crypto
});
```

Generate it here rather than copying a previous token's jti into the next payload. Use either jwtid in the signing options or jti in the payload; avoid specifying both. Because the digest covers the complete JWT, you do not need a separate database jti column just to distinguish current tokens.

**Tests:** freeze time, generate two refresh tokens for the same user/session, and verify that both the token strings and verified jti values differ while sub and sid remain equal.

#### Make one refresh token usable by only one rotation

**Current flow:** JwtRefreshStrategy validates a session and returns a user; later, refreshTokens calls handleTokensCreation, which overwrites that session without checking the token it replaced. Two requests can both validate token A, both write a replacement, and both report success.

**Desired sequence:** verify token A, generate candidate token B, and replace A's digest only if the database still contains A's digest and the session is active. Send B's cookies only after the update succeeds. Signing a candidate before the update is fine; it must not be returned if the update loses the race.

An illustrative database operation is:

```typescript
const result = await prisma.session.updateMany({
  where: {
    id: verified.sessionId,
    userId: verified.user.id,
    refreshToken: verified.refreshTokenDigest, // use renamed field if applicable
    revokedAt: null,
    expiresAt: { gt: new Date() },
  },
  data: {
    refreshToken: nextDigest,
    expiresAt: nextExpiresAt,
  },
});

if (result.count !== 1) {
  throw new UnauthorizedException('Invalid refresh token');
}
// Only now set the new cookies.
```

The comparison and replacement happen in the same database operation. A preceding SELECT followed by an unconditional UPDATE is insufficient, even if the code calls both operations a rotation. Prisma describes the general pattern as [optimistic concurrency control](https://www.prisma.io/docs/orm/fundamentals/transactions).

Separate initial login issuance from refresh rotation: a newly created session has no previous token to compare. Also make logout and rotation agree about revoked state, so rotation cannot write new credentials into an already revoked session. A dedicated SessionsService.rotateRefreshToken method communicates this invariant better than its current generic update method.

For now, reject a replay of A after B is stored. Automatic revocation of the entire session on every mismatch is a separate policy: a legitimate concurrent browser refresh can also lose this race. The client should coordinate refreshes so multiple failing API requests share one in-flight refresh operation.

**Tests:** use real Postgres on an isolated E2E database for the concurrency case. Submit two requests with token A; exactly one succeeds, the other gets 401, and only the winner's refresh token works afterward. Mock-only tests cannot establish the database operation's concurrency behavior. Also test an unsuccessful database write does not send success cookies.

#### Handle sessions created with the old storage format

Existing rows contain bcrypt hashes. New code comparing SHA-256 digests cannot treat those rows as new-format sessions. Decide how to cross that boundary before deployment.

For a development project without active users, the simplest policy is to invalidate existing sessions and require login again. Keep users, passwords, projects, and tasks unchanged. If access-token validation uses the session-revocation policy described below, revoking sessions also blocks those access tokens; otherwise they may still work until expiry.

If preserving sessions matters, add a format/version field and support legacy verification for a bounded transition. After successful legacy verification, rotate into the new digest format with a conditional update. That path temporarily preserves the old bcrypt limitation and needs an explicit removal deadline. Do not attempt to derive SHA-256(token) from an existing bcrypt hash: the original token is needed.

If renaming the Prisma field, create a migration and regenerate the client. Document whether rollout requires sign-in again. Any bulk session invalidation must be a deliberate deployment action against the intended database, not an implicit side effect of app startup or a test run.

**Tests:** a legacy row follows the selected invalidation/transition behavior; ordinary password login still works; unrelated user/application data survives the change.

#### Verify JWT claims and decide access-token revocation behavior

Your AuthModule sets issuer/audience when signing, but JwtStrategy and JwtRefreshStrategy currently do not demand those values when verifying. Configure the access strategy with the access secret and the refresh strategy with the refresh secret. Add the expected issuer, audience, and explicit allowed algorithm to both:

```typescript
issuer: config.issuer,
audience: config.audience,
algorithms: ['HS256'], // also select HS256 explicitly when signing
ignoreExpiration: false,
```

These options are supported by [passport-jwt](https://www.passportjs.org/packages/passport-jwt/). Preserve separate access/refresh secrets. Verify required payload fields are correctly typed and nonempty, and ensure session.userId equals payload.sub. A valid signature authenticates the issuer's token; it does not automatically establish that every claim has the shape or domain relationship your application expects.

Next decide what logout means for an access token already issued. The current access strategy only loads the user, so revoking a session does not stop that token immediately.

| Policy | What to implement | Consequence |
| --- | --- | --- |
| Immediate revocation, recommended for this session-backed app | Access strategy checks the sid session exists, belongs to sub, and is not revoked; define its expiry handling | Logout blocks subsequent protected requests, at the cost of a session lookup per request |
| Expiry-based revocation | Keep access verification stateless with a short, documented access TTL | Logout stops refresh, but existing access tokens remain usable until their exp |

For immediate revocation, session lookup errors should not authenticate the request. Use null/missing checks as well as date checks because Session.expiresAt is nullable. Do not compare an access token against the refresh-token digest: they are different credentials.

**Tests:** properly signed tokens with the wrong issuer/audience/algorithm are rejected; access and refresh tokens cannot substitute for each other; sid belonging to another user is rejected; post-logout access follows the chosen policy.

#### Make email-verification policy explicit

Registration creates email-verification state, but validateUser currently returns a user after checking only the password. Sending a verification email does not prevent that account from signing in.

Recommended initial policy: allow login only after email verification. Check emailVerified after validating the password and before creating a session or cookies. Return a deliberate response, such as 403 with a stable application error code for an unverified account whose credentials are correct. Continue using the generic invalid-credentials response for a nonexistent email or incorrect password.

If unverified users should have limited access instead, define exactly which routes they may use and enforce that on the server. It is a larger policy change than simply allowing login. Also decide what happens to existing sessions if an account becomes unverified later, for example after a future email-change flow: refresh and access validation should enforce the chosen rule consistently.

Make sure users can actually complete verification before enforcing the gate. Check the frontend verification URL and token expiry. A resend endpoint, if added, should have bounded rate limits and intentional response behavior. Do not bundle a full password-reset implementation into this step merely because it is in the same auth module.

**Tests:** correct credentials for an unverified user produce no session/cookies; wrong credentials still give the generic error; successful verification permits login; expired verification tokens do not set emailVerified; existing-session behavior matches your documented policy.

#### Suggested implementation order and final checks

Implement logout verification first, then the token helper and jti, then atomic rotation and its storage-transition policy. Finish claim checks/access revocation and email verification policy. Some changes are coupled: deploy digest storage and its rotation/transition logic together so a partially updated application does not reject its own sessions.

Run focused auth, JWT provider, and session-service tests while working. At the end, run the complete unit suite, build, and auth E2E tests against an explicitly selected disposable database. Update API documentation for any changed logout/login response status or semantics. None of the snippets above are drop-in patches; they show the intended contracts and must be integrated with your request types, cookie helper, session schema, and tests.

**How to verify:** test valid login/refresh/logout, a tampered signature, missing cookies, an expired token, a known session ID inside a forged token, an old refresh token after rotation, and two concurrent refreshes. For the concurrency test, at most one request should successfully consume a particular refresh token under a single-use policy.

**Done when:** those behaviors are implemented and tested, with the persisted-session transition documented. These are application corrections, not Nest migration requirements; keep their commits separate. Schedule this work independently of the framework migration.

## Additional application findings

The findings below preserve the original evidence and proposed fixes. Authentication findings overlap the detailed guide above intentionally, so both the code-path evidence and implementation explanation remain available. Historical audit counts and version candidates are snapshots, not current guarantees. Already-completed items, such as lowercase Compose image tags and Docker Prisma generation, need only be confirmed and checked off.

### High — Logout trusts an unverified session selector

Evidence: `auth.controller.ts` marks the entire controller public; logout has no explicit auth guard. `auth.service.ts:169` obtains the session ID through `getSessionIdFromRequest`, and `jwt-token.provider.ts:50` uses `decode`, not signature verification. Session update is then performed by that ID.

Impact: a crafted token-shaped cookie containing a known session ID can select a session for revocation. This is a code-path finding, not a live exploit test. Missing/malformed tokens can also produce generic errors instead of a controlled response.

Fix: verify the refresh token and bind it to its stored session/user before mutation, or use an authenticated session identity with an explicit ownership check. Add tests for tampered, expired, missing, and another user's session tokens.

### High — Bcrypt is unsuitable for storing the complete refresh JWT

Evidence: `auth.service.ts:322` hashes the complete refresh token through BcryptHashingService. Bcrypt compares only its supported prefix of 72 bytes. A local probe confirmed that two inputs sharing 72 bytes but differing afterward compare equal.

Impact: rotated JWTs with the same prefix can satisfy the stored-token comparison; JWT signature verification still happens in the refresh strategy, so this is not an arbitrary-signature bypass. It weakens detection of previously valid token replay. JWT generation also has no per-token jti, so same-payload tokens created in the same second can be identical.

Fix: store a full-token SHA-256 digest or HMAC for high-entropy refresh tokens, add a unique jti, and rotate atomically with compare-and-swap or equivalent transactional logic. Current validation and update occur separately, permitting concurrent refresh races. Existing stored hashes need an explicit invalidation/transition policy. Retain a password-specific hash policy separately; signup currently has no password length/strength bounds, including no UTF-8 byte limit for bcrypt.

### Medium — Revocation and JWT identity checks are incomplete

JwtStrategy only loads `payload.sub`; it does not check the session identified by sid. A revoked session's access token therefore remains usable until expiration. Both strategies omit explicit issuer/audience checks even though signing config supplies them. Email verification is not checked by validateUser, so unverified users can log in if that is not intentionally allowed.

Fix: define the revocation policy, add the required session checks or document bounded access-token lifetime, verify expected issuer/audience/algorithm, and enforce the chosen email-verification policy. Test these behaviors.

### High priority maintenance — Dependency advisories

The online audit identifies 81 affected package entries. Critical entries are transitive `handlebars` and `proxy-addr`; high-severity direct dependency entries include Nest core/platform/swagger/config, Joi, Jest, Prisma, and ts-loader, sometimes through inherited dependency findings. Counts include overlapping dependency chains and development packages.

Fix: update the relevant parent dependencies/lockfile, then inspect production paths and advisory applicability. Two examples from the evidence are [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) and [Nest core advisory](https://github.com/advisories/GHSA-36xv-jgw5-4q75). Do not equate an audit result with a demonstrated exploit in this app.

### Medium — Reminder time selection and delivery state are incorrect/incomplete

`tasks.service.ts:353` selects all pending reminders from the start of today through the start of tomorrow, rather than reminders due at or before now. It can deliver later-today reminders early and permanently miss previous-day pending reminders after downtime. The inclusive upper bound also includes midnight tomorrow. Scheduling uses server-local day boundaries despite user timezone settings.

`task-reminders.job.ts` creates a database notification tagged EMAIL and then marks the reminder SENT; that path does not actually send email. There is no atomic claim or idempotency key, so overlapping jobs/multiple replicas or a failure between create and mark can duplicate notifications. Clearing remindAt in update does not explicitly cancel the pending status.

Fix: query overdue/due pending work using an explicit instant, claim work atomically, use durable retry/delivery state, honor preferences/timezone policy, and make creation/delivery idempotent. Test downtime recovery and concurrent workers.

### Medium — E2E behavior differs from production

`main.ts` installs RequestValidationPipe, which keeps request body conversion strict. `test/helpers/app.ts` instead installs a ValidationPipe with implicit conversion enabled for all inputs. E2E tests can accept bodies that production rejects. E2E setup also mixes NODE_ENV and APP_ENV selectors, and CI currently runs only unit tests plus build.

Fix: share setup code and isolate the E2E database before running migrations. Add a CI Postgres service and E2E coverage for projects/tags/preferences as well as existing auth/tasks.

### Medium — Browser authentication configuration is incomplete

`cors.config.ts` hardcodes localhost:4200 and omits `credentials: true`, although authentication uses cookies. Cross-origin browser credential requests need a deliberate origin allowlist and credentials configuration. SameSite=strict can also prevent expected cross-site deployment flows.

Fix: configure origin/credential/cookie policy for the actual frontend deployment and test it in a browser. Assess CSRF protection against that chosen deployment; SameSite alone is not a complete review of same-site threats. Configure reverse-proxy/IP policy before relying on IP throttling in production.

### Medium — Soft delete is only partially implemented

`database/prisma.extensions.ts` filters findFirst/findUnique/findMany and overrides delete/deleteMany, but not count, aggregate, relation includes, or throwing find methods. It also removes deletedAt from returned records while declaring Prisma-shaped generic results. Repeated delete can still update an already deleted task; the service reports success because deleteMany does not filter deletedAt.

Fix: define operation-by-operation soft-delete semantics, use the actual extended client type rather than casting transaction clients as PrismaService, and cover nested/throwing/count/transaction paths with database tests. The task list manually filters its count today, so this is not a claim that its current pagination count is wrong.

### Medium — Registration side effects precede persistence

`auth.service.ts:94` sends the verification email before creating the user at line 105. A later database failure leaves a delivered link for a nonexistent account; concurrent registrations can both send email before the uniqueness constraint decides the winner.

Fix: persist user/verification state and an outbox event transactionally; send email afterward with retry. Provide bounded resend behavior. reset-password is exposed but explicitly returns NotImplementedException; implement it or remove it from the advertised API until ready.

### Medium — DTO and response shapes need an explicit contract

CreateTaskDto declares Date properties but validates ISO8601 strings; the strict body pipe does not turn them into Date instances. TaskEntity declares tagIds but services include Prisma TaskTag rows as `tags` and Object.assign them into the instance. Declared class properties do not map or exclude runtime properties by themselves.

Fix: represent incoming dates as strings and map them at the service boundary, or provide intentional transformation with matching validation. Add response mappers to produce tagIds and the intended fields consistently for create/list/find/update. Ensure OpenAPI matches runtime values.

### Medium — Database lifecycle and consistency need hardening

PrismaService is an empty class; the factory returns an extended PrismaClient with no explicit Nest disconnect hook. app.enableShutdownHooks alone does not register a Prisma-specific disconnect. Add a provider lifecycle implementation and verify pool cleanup.

Project updates/transfers use updateMany followed by a separate read, allowing concurrent changes to alter the response. Project ownership transfer leaves linked tasks owned by their original users, so define that domain rule explicitly. Deleting a project with tasks has no explicit onDelete policy in the schema and can fail on the foreign key.

Fix: use suitable atomic operations/transactions, define transfer and delete semantics, and test them. Choose query-driven indexes for task user/deletedAt/sort filters, reminder pending/time scans, and project owner lookup; an index beginning with globally unique id does little for user-only list queries. Verify plans before choosing exact composite index orders.

### Low/medium — Audit identity and reliability

`audit-logger.service.ts:35` treats every missing actorUserId as SYSTEM and overwrites supplied actorType, which misclassifies anonymous auth attempts. Fire-and-forget audit writes can be lost during termination; errors are logged and swallowed.

Fix: preserve explicit actor type, distinguish ANONYMOUS from SYSTEM, and use durable/transactional logging for events that must be recorded.

### Operational — Containers and environment management

The supplied main Dockerfile is explicitly for development and starts watch mode; it is not a production deployment. Compose image names such as `AppShell/backend:latest` use uppercase repository components, which need normalization for Docker image-reference rules. Postgres port mapping uses the configured port on both sides, but POSTGRES_PORT is not a substitute for configuring the server's listening port; a non-default value requires corresponding server configuration or mapping to internal 5432.

The database and migration image versions are independently pinned; keep them explicit when refreshing digests. Generated Prisma files can be copied from the host because .dockerignore does not exclude generated output; clean generation should be part of the build. Prisma's env loader can override injected values with environment-specific files, while the application uses a different loading policy. Normalize this before deployment.

Only `.env.example` is tracked among environment files in the current index. Secret values were not inspected, and Git history was not scanned for historical secrets.

## Deferred maintenance guidance

These were formerly presented as migration steps 5-7. Treat them as independent workstreams; commands are examples to review, not instructions to run against an existing valuable database. New production infrastructure and general dependency refreshes are not required by the focused migration plan.

### Database tooling and environment maintenance

**Why:** Prisma has a CLI that generates source, a runtime client that executes queries, and an adapter/driver that connects to Postgres. Different versions and environment selection rules across your machine, CI, and migration container make database failures difficult to reproduce.

**Files involved:** package.json/package-lock.json, prisma.config.ts, prisma/env.ts, prisma/schema.prisma, generation scripts, Prisma provider, Dockerfiles, compose.yaml, and scripts/e2e-setup.js.

**What to do:**

1. Select the same exact Prisma version for the CLI, client, and adapter. The reviewed stable candidate is 7.10.0:

   ```powershell
   npm.cmd install --save-exact @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg@8.23.1
   npm.cmd install -D --save-exact prisma@7.10.0 @types/pg@8.23.1
   ```

   Ensure pg appears only in dependencies afterward; inspect both sections because it currently lives in devDependencies. Keep @types/pg in devDependencies. Do not select Prisma's unqualified latest tag: at review time it pointed to an 8.0 release candidate.
2. Update Dockerfile.migrations to the same selected CLI version. Prefer deriving its installation from a committed lockfile rather than its current independent npm install, so the migration job is reproducible too.
3. Keep the generated client's CJS module format for this migration. Regenerate it after upgrading, then verify the generated imports and the portable helper from Step 1. Do not hand-edit generated client internals: those changes disappear on the next generation.
4. Put generation explicitly in the clean build sequence: install dependencies, copy schema/config and required source, generate, build, then start compiled output. Validate that an absent developer-generated directory does not break Docker/CI. Decide whether to exclude generated files from Docker context so stale host output cannot mask a missing generation step.
5. Define one environment precedence policy. A reasonable policy is: deployed commands use injected variables; local commands use a selected environment file; explicit overrides are deliberate. Apply it consistently in the app and Prisma loaders. In particular, avoid overriding an injected DATABASE_URL with a development file.
6. Fix E2E selection before loading Prisma configuration. scripts/e2e-setup.js currently sets NODE_ENV=e2e, but the application's selector is APP_ENV. Set APP_ENV=e2e in the child environment and ensure any dotenv import follows the intended precedence. Use a separate disposable E2E database and confirm the destination without printing its password.
7. Implement Prisma cleanup on the provider that Nest actually creates. The current factory returns an extended client, so adding a method to an unused class is insufficient. Ensure shutdown calls $disconnect on that actual instance and verify it does not leave the database pool running.

**How to verify:** generate and build, then test database access on a disposable Postgres instance. Run `npx.cmd prisma migrate deploy` against both a new disposable database and a disposable copy at the previous schema state. A package-version update alone should not require inventing a new schema migration. If a model change from the authentication backlog is needed, create a specific reviewed migration for that change.

Do not run migration reset or seed commands against an existing valuable database. Validate fresh and existing-schema upgrades on a disposable database and keep the historical migrations intact.

**Done when:** the client can be generated from scratch, existing migrations deploy successfully, the app performs real queries, and shutdown releases its connections using the same package versions and environment policy across environments.

### General dependency and advisory maintenance

**Why:** a Nest major update will refresh some transitive packages, but it does not guarantee that the rest of the dependency tree is current or free of applicable advisories. At the same time, unrelated major upgrades can multiply the number of failures you must diagnose.

**Files involved:** package.json/package-lock.json, eslint.config.mjs, and specific runtime integrations affected by updated packages.

**What to do:**

1. Rerun `npm.cmd outdated` and `npm.cmd audit` after the Nest/Prisma upgrades. The saved audit is historical evidence; use the refreshed result to choose remaining fixes. Also run `npm.cmd audit --omit=dev` to inspect the runtime dependency subset separately.
2. Update remaining dependencies in small groups from the dependency inventory below. A sensible first runtime group is Joi 18.2.9, Helmet 8.3.0, and Resend 6.33.0. Check environment validation, response headers, and mocked email API success/error paths after that group.
3. Update Jest/Supertest and their corresponding typings together, then execute the tests. Keep Jest 30 and ts-jest's supported versions; changing test runner is unnecessary for this migration. Select Node 24 typings instead of installing the latest Node 26 types, which could permit APIs unavailable in the chosen runtime.
4. Keep ESLint 9 initially and align @eslint/js to its v9 line. Upgrade its compatible plugins/configs as needed. If you later choose ESLint 10, do it in a separate change with @eslint/js and the config reviewed together. Add a `lint:check` script that runs ESLint without --fix; the existing lint script edits files and is unsuitable as a purely verifying CI step.
5. Leave optional larger changes such as dotenv 18, class-validator 0.15, or a test-runner replacement for separate work unless a verified issue requires them. In a 0.x package, a minor update may still contain breaking behavior, so class-validator 0.15 deserves an intentional DTO test pass.
6. Check direct imports from transitive dependencies. Add type-only imports and explicit development typings where appropriate for ms, passport-jwt, and passport-local. A module being present due to another package's install is not a stable direct dependency contract.
7. For each remaining advisory, identify its path with `npm.cmd explain <package>`, read the advisory, and update the parent that brings it in. Verify the affected behavior is relevant to this app. Do not blindly use `npm audit fix --force`: a suggested fix can include a major change or downgrade that conflicts with this plan.

**How to verify:** after each group, run npm ls, type checking, non-mutating lint, relevant tests, and build. Review the lockfile diff for unexpected major versions. Run the full audit again at the end and document any unresolved item with its dependency path, exposure, and follow-up.

**Done when:** selected packages remain within compatible peer ranges and every remaining audit finding has a concrete disposition. A smaller audit count alone is not enough if runtime behavior or reproducibility regressed. TypeScript remains version 6 throughout this step.

### Test infrastructure and production hardening

**Why:** a passing compiler cannot detect a wrong cookie policy, a missing generated client, a bad Docker entry point, or E2E tests that configure validation differently from production. This step proves the migrated system works as an application.

**Files involved:** main.ts, a shared application-setup module, test/helpers/app.ts, package scripts, .github/workflows/github-presubmit-actions.yml, Dockerfiles, .dockerignore, compose.yaml, and development/deployment documentation.

**What to do:**

1. Extract request setup into a function used by both main.ts and the E2E helper. Include the same validation pipe, exception filters, serializers, cookie parser, and relevant middleware. Keep listening on a port and environment-specific concerns outside that shared function. This prevents tests from silently using a more permissive body validator than production.
2. Configure CI with the same Node version and npm workflow as development: clean install, generate Prisma client, type check, lint check, unit tests, build. Add a Postgres service and a separate E2E job/phase using APP_ENV=e2e and disposable credentials. Never point that job at the development or production database.
3. Add or run integration checks for authentication, cross-user access denial, project ownership, tag ownership, soft deletion, response fields, and health failures. Validate reminder timing and duplicate prevention in a controlled test environment when implementing those findings. These checks verify behavior that ordinary mocks can miss.
4. Inspect the generated OpenAPI document against representative responses. Pay particular attention to TaskEntity/tagIds, date fields, enums, and optional DTO fields. Confirm excluded/sensitive properties do not appear in API responses.
5. Provide a production Docker build separate from the existing development watch image. Use a build stage with dev tools to generate/compile; make the runtime stage contain compiled output and required production packages/assets. Run as a non-root user, start the verified compiled entry point, and ensure the container works without ts-node, Nest CLI, or a developer-generated directory.
6. Keep Prisma migration execution in its own image/job with its required CLI dependencies. Production runtime pruning should not remove tools from the migration job, nor should the HTTP server need those development tools to start.
7. Fix Compose image names to lowercase. For non-default host Postgres ports, map the chosen host port to internal 5432 unless you explicitly configure Postgres itself to listen elsewhere. Verify database URLs use the service hostname and internal port when called from another container.
8. Test cookies and CORS with the intended frontend origin. Use an explicit origin allowlist and credentials configuration where cookie-based cross-origin requests are required. Verify secure cookies under the production HTTPS/reverse-proxy arrangement and test an actual browser request, since Supertest does not enforce browser CORS policy.
9. Verify stopping the app/container releases its database connections and finishes or safely abandons work. Run the current dependency audit once more against the final lockfile. Update README with prerequisites, generation/build/start commands, environment selection, migration commands, and troubleshooting notes.

**Suggested verification sequence after adding the relevant scripts:**

```powershell
npm.cmd ci
npm.cmd run prisma:generate
npx.cmd tsc --noEmit -p tsconfig.build.json
npm.cmd run lint:check
npm.cmd test -- --runInBand
npm.cmd run build
npm.cmd run test:e2e
```

The E2E command runs setup migrations, so configure the disposable E2E database before running it. After that, build the production image and exercise its HTTP endpoints against a disposable database. The production start check must use compiled output, not start:dev.

**Done when:** a clean checkout passes the CI sequence, the production image starts and serves representative requests, and shutdown works. Record the final versions and validation evidence. Review the application findings below as separate follow-up tasks.

## Dependency maintenance reference (15 October snapshot)

This inventory includes packages whose updates are optional for the migration. The focused migration plan identifies compiler/framework packages that must change; this table does not require updating all packages together.

### Compiler, tests, lint, and development tools

| Dependency | Installed | Available/selected action |
| --- | --- | --- |
| `typescript` | 6.0.3, manifest ^5.7.3 | Select 6.0.3 explicitly; keep the ordinary package name; defer TS7 |
| `ts-jest` | 29.4.11 | 29.4.15; keep TS6 API available. Its v29 name does not mean Jest 30 is unsupported |
| `jest` | 30.2.0 | 30.5.2; retain initially |
| `@types/jest` | 30.0.0 | Keep 30.x with Jest 30 |
| `typescript-eslint` | 8.59.4 | 8.71.2, using TS6 |
| `eslint` | 10.4.0, manifest ^9.18.0 | Restore locked 9.x baseline first; optional coordinated move to 10.12.0 |
| `@eslint/js` | 9.39.1 | 9.39.5 if remaining on ESLint 9; 10.0.1 for ESLint 10 |
| `@eslint/eslintrc` | 3.3.3 | 3.3.7, or remove after confirming it is unused by the flat config |
| `eslint-plugin-prettier` | 5.5.5 | 5.5.7 |
| `eslint-config-prettier` | 10.1.8 | No newer latest reported |
| `globals` | 16.5.0 | 17.13.0 optional major |
| `prettier` | 3.8.1 | 3.9.10; keep formatting churn separate |
| `ts-loader` | 9.5.7 | 9.6.2 if retained; only remove after confirming the selected build pipeline does not use it |
| `ts-node` | 10.9.2 | No newer latest reported; TS6-dependent legacy execution path needs testing |
| `tsx` | 4.22.3 | 4.23.15 for Prisma seed tooling; not a general decorator-metadata replacement for Nest |
| `tsconfig-paths` | 4.2.0 | Keep while needed by debug/build workflow; verify emitted alias behavior |
| `source-map-support` | 0.5.21 | Keep initially; evaluate removal in favor of Node source maps later |
| `cross-env` | 10.1.0 | No forced update identified |
| `supertest` | 7.1.4 | 7.3.1 |
| `@types/supertest` | 6.0.3 | 7.2.1; inspect test import typing |
| `@types/node` | 22.19.1 | Select Node 24 typings to match runtime; latest 26.6.5 is not the right automatic target |

### Database and other runtime dependencies

| Dependency | Installed | Proposed action |
| --- | --- | --- |
| `prisma` | 7.8.0 | Pin 7.10.0 with client and adapter; latest tag currently points to 8.0.0-rc.23, so avoid an unqualified latest upgrade |
| `@prisma/client` | 7.4.0 | 7.10.0; regenerate client |
| `@prisma/adapter-pg` | 7.4.0 | 7.10.0 |
| `pg` | 8.18.0 | 8.23.1; move direct declaration to dependencies because it is used in the runtime database stack. Adapter already declares pg transitively, so current placement alone does not prove a production crash |
| `@types/pg` | 8.16.0 | 8.23.1; stays development-only |
| `joi` | 18.0.2 | 18.2.9; security maintenance priority |
| `class-validator` | 0.14.3 | Prefer 0.14.4 first; evaluate 0.15.1 separately with DTO regression tests |
| `class-transformer` | 0.5.1 | Retain; no forced update identified |
| `dotenv` | 17.4.1 | 17.4.2 first; review 18.0.8 separately because environment precedence is already inconsistent |
| `helmet` | 8.1.0 | 8.3.0 |
| `resend` | 6.12.3 | 6.33.0; check email API/error behavior |
| `rxjs` | 7.8.2 | Retain 7.8.2; compatible peer line |
| `reflect-metadata` | 0.2.2 | Retain; essential to current DI/decorator approach |
| `bcrypt` / `@types/bcrypt` | 6.0.0 / 6.0.0 | Retain for passwords initially; replace its use for long refresh tokens, described below |
| `cookie-parser` / `@types/cookie-parser` | 1.4.7 / 1.4.10 | No forced update identified |
| `passport` | 0.7.0 | No forced update identified |
| `passport-jwt` | 4.0.1 | No forced update identified; add explicit direct typings if needed |
| `passport-local` | 1.0.0 | No forced update identified; add explicit direct typings if needed |
| `cron-validate` | 1.5.3 | No forced update identified |
| `@types/express` | 5.0.6 | Retain Express 5 types; check against upgraded adapter |

`auth.config.ts` also imports `StringValue` from transitive package `ms`. Declare it and its typings explicitly if that import remains, preferably as a type-only import. Audit `@types/passport-jwt` and `@types/passport-local` similarly instead of relying on hoisting or disabled implicit-any checks.
