import { Injectable } from '@nestjs/common';

import { AsyncLocalStorageService } from '@common/async-local-storage/async-local-storage.service';
import { PrismaService } from '@database/prisma.service';
import { ActorType } from '@generated/prisma';
import { LoggerService } from '@loggers/app/logger.service';
import { AuditPayload } from '@loggers/interfaces/audit-payload.interface';

@Injectable()
export class AuditLoggerService {
  constructor(
    private readonly alsService: AsyncLocalStorageService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuditLoggerService.name);
  }

  /**
   * Synchronous wrapper for logging audit records without awaiting the result
   * This allows the main flow to continue without waiting for the database operation to complete
   * Use logAsync for cases where you want to await the logging operation (e.g., during testing)
   *
   * *NOTE: The synchronous wrapper does not guarantee that the audit log has been persisted before the main flow continues, so use with caution in critical paths.
   */
  log(payload: AuditPayload): void {
    void this.logAsync(payload);
  }

  async logAsync(payload: AuditPayload): Promise<void> {
    try {
      const { extraContext: extra, ...restPayload } = payload;
      const actorUserId = this.getActorUserId(payload);
      const extraContext = extra ?? undefined;
      const actorType = actorUserId ? ActorType.USER : ActorType.SYSTEM;

      await this.prisma.auditLog.create({
        data: { ...restPayload, actorUserId, actorType, extraContext },
      });
    } catch (error) {
      // Handle logging failure (e.g., log to a file, external service, etc.)
      this.logger.error(
        payload.actorUserId
          ? `Failed to log audit record for user ${payload.actorUserId}:`
          : 'Failed to log audit record:',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private getActorUserId(payload: AuditPayload): string {
    return payload.actorUserId ?? this.alsService.getUserId();
  }
}
