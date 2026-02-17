import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AlsModule } from '@common/async-local-storage/async-local-storage.module';
import appConfig from '@config/app.config';
import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@database/database.module';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { RolesGuard } from '@guards/roles.guard';
import { LoggerModule } from '@loggers/app/logger.module';
import { AccountPreferencesModule } from '@modules/account-preferences/account-preferences.module';
import { AuthModule } from '@modules/auth/auth.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    AlsModule, //* AsyncLocalStorage module should be imported before any modules that use it (e.g. Logger) to ensure the interceptor is applied globally
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
    LoggerModule,

    // * Feature modules
    AuthModule,
    UsersModule,
    TasksModule,
    NotificationsModule,
    ProjectsModule,
    AccountPreferencesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // * RolesGuard should be after JwtAuthGuard to ensure user is authenticated
    // * and 'user' field is populated on the 'request' before checking roles
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
