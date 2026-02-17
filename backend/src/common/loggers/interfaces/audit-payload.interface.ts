import { AuditAction } from '@loggers/enums/audit-actions.enum';

export declare interface AuditPayload {
  action: AuditAction;
  actorUserId: string;
  targetEntity: string;
  targetEntityId: string;

  extraContext?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export declare interface AuditPayloadWithoutActor extends Omit<
  AuditPayload,
  'actorUserId'
> {}
