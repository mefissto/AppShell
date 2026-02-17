import { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import databaseConfig from '@config/database.config';
import { PrismaClient } from '@generated/prisma';

import {
  excludeSoftDeleted,
  softDelete,
  softDeleteMany,
} from './prisma.extensions';

export class PrismaService extends PrismaClient {}

export const prismaServiceFactory = (
  dbConfig: ConfigType<typeof databaseConfig>,
) => {
  const adapter = new PrismaPg({ connectionString: dbConfig.url });
  const prisma = new PrismaClient({ adapter });

  return prisma
    .$extends(softDelete)
    .$extends(softDeleteMany)
    .$extends(excludeSoftDeleted); // ← return extended instance
};
