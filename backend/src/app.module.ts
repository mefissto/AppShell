import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@database/database.module';
import { AuthGuard } from '@guards/auth.guard';
import { AuthModule } from '@modules/auth/auth.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, UsersModule, TasksModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
