import { Global, Module } from '@nestjs/common';

import databaseConfig from '@config/database.config';
import { PrismaService, prismaServiceFactory } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: prismaServiceFactory,
      inject: [databaseConfig.KEY],
    },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {
  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.prismaService.$connect();
      console.log('Connected to the database');
    } catch (error) {
      console.error('Failed to connect to the database', error);
    }
  }
}
