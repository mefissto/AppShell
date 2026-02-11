import { BaseEntity } from '@entities/base.entity';

/**
 * Session Entity representing a session in the system.
 */
export class SessionEntity extends BaseEntity {
  id: string;
  refreshToken: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;

  constructor(partial: Partial<SessionEntity>) {
    super();
    Object.assign(this, SessionEntity.filterNullishValues(partial));
  }
}
