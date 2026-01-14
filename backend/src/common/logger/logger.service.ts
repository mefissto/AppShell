import {
    ConsoleLogger,
    Inject,
    Injectable,
    LoggerService as NestLoggerService,
    Scope,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';

import appConfig from '@config/app.config';
import { EnvironmentModes } from '@interfaces/environment-variables';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger implements NestLoggerService {
  // TODO: add request correlation (AsyncLocalStorage) so logs carry requestId/userId.
  // TODO: switch to structured schema (timestamp, level, message, context, requestId, path, status, duration, error stack).
  // TODO: centralize error logging with normalization and redaction of sensitive fields.
  // TODO: expose transports/config (stdout default; optional files/vendor forwarders) behind flags.
  // TODO: provide test-friendly logger/mocks and hook Prisma logs with sampling/masking.
  // TODO: document level usage and schema; add runtime log-level switch if needed.
  // TODO: emit lifecycle/ops logs (startup, shutdown, health checks, version/build hash).
  // TODO?: think about switching to pino or winston for more advanced features
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    super({
      json: config.env === EnvironmentModes.PRODUCTION,
      prefix: config.name,
      logLevels: [config.logLevel],
    });
  }
}
