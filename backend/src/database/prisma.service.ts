import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: `${process.env.DATABASE_URL}`,
    });
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
