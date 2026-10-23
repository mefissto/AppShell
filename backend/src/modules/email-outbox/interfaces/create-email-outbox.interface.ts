import { Prisma } from '@generated/prisma';

import { EntityType } from '@enums/entity.enum';

export interface CreateEmailOutboxInput {
  to: string;
  subject: string;
  payload: Prisma.InputJsonObject;
  entityType?: EntityType;
  entityId?: string;
}

export interface EmailOutboxPayloadData {
  taskTitle: string;
  taskDueDate: string | null;
}
