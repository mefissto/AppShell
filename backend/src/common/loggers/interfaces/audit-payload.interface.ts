import { ActorType, Prisma } from '@generated/prisma';
import { AuditAction } from '@loggers/enums/audit-actions.enum';

export declare interface AuditPayload {
  action: AuditAction;
  actorType?: ActorType;
  actorUserId?: string;
  targetEntity: string;
  targetEntityId?: string;
  extraContext?: Prisma.JsonValue;
  ipAddress?: string;
  userAgent?: string;
}
