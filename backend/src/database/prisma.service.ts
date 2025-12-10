import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import databaseConfig from '@config/database.config';
import { PrismaClient } from '@generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) {
    const adapter = new PrismaPg({ connectionString: dbConfig.url });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('Connected to the database');
    } catch (error) {
      console.error('Failed to connect to the database', error);
    }
  }
}
