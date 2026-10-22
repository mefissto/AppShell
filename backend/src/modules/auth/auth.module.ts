import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import authConfig from '@config/auth.config';
import { AuthStrategy } from '@enums/auth-strategy.enum';
import { AuditLoggerModule } from '@loggers/audit/audit-logger.module';
import { EmailModule } from '@modules/email/email.module';
import { SecurityModule } from '@modules/security/security.module';
import { UsersModule } from '@modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenProvider } from './providers/jwt-token.provider';
import { EmailVerificationService } from './services/email-verification.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    SecurityModule,
    EmailModule,
    AuditLoggerModule,
    PassportModule.register({ defaultStrategy: AuthStrategy.JWT }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigType<typeof authConfig>) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.accessTokenTtl,
          audience: config.audience,
          issuer: config.issuer,
        },
      }),
      inject: [authConfig.KEY],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenProvider,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    EmailVerificationService,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
