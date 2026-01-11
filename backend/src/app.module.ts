import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import appConfig from '@config/app.config';
import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@database/database.module';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { AuthModule } from '@modules/auth/auth.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigType<typeof appConfig>) => [
        // TODO: Different throttling strategies per route?
        // https://docs.nestjs.com/security/rate-limiting
        // Think about using Redis or other storage for throttling in production
        // TODO: Add more advanced configurations if needed
        {
          ttl: config.throttleTtl,
          limit: config.throttleLimit,
        },
      ],
      inject: [appConfig.KEY],
    }),
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    TasksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
