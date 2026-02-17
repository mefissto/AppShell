import { Injectable } from '@nestjs/common';

import { AsyncLocalStorageService } from '@common/async-local-storage/async-local-storage.service';
import { PrismaService } from '@database/prisma.service';
import {
  AuditPayload,
  AuditPayloadWithoutActor,
} from '@loggers/interfaces/audit-payload.interface';

@Injectable()
export class AuditLoggerService {
  constructor(
    private readonly alsService: AsyncLocalStorageService,
    private readonly prisma: PrismaService,
  ) {}

  async log(payload: AuditPayload | AuditPayloadWithoutActor): Promise<void> {}
}
