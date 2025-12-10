import { Module } from '@nestjs/common';

import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, UsersModule, TasksModule],
})
export class AppModule {}
