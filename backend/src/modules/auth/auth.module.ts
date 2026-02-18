import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import jwtConfig from '@config/jwt.config';
import { AuthStrategy } from '@enums/auth-strategy.enum';
import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SecurityModule } from '@modules/security/security.module';
import { UsersModule } from '@modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenProvider } from './providers/jwt-token.provider';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    SecurityModule,
    AuditLoggerModule,
    PassportModule.register({ defaultStrategy: AuthStrategy.JWT }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigType<typeof jwtConfig>) => ({
        secret: config.secret,
        signOptions: {
          expiresIn: config.accessTokenTtl,
          audience: config.audience,
          issuer: config.issuer,
        },
      }),
      inject: [jwtConfig.KEY],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenProvider,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
