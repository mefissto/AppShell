import { CookieKeys } from '@enums/cookie-keys.enum';
import { DocumentBuilder } from '@nestjs/swagger';

/**
 * The swagger configuration.
 */
export const SWAGGER_CONFIG = new DocumentBuilder()
  .setTitle('Server API')
  .setDescription('The API description')
  .setTermsOfService('https://www.localhost:3000/terms-of-service')
  .setLicense('MIT License', 'https://www.localhost:3000/license')
  .addServer('http://localhost:3000')
  .setVersion('1.0')
  // Declare cookie-based auth schemes used by guards/strategies
  .addCookieAuth(CookieKeys.Authentication)
  .addCookieAuth(CookieKeys.RefreshToken)
  .build();
