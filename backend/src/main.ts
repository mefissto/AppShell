import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import appConfig from '@config/app.config';
import { CORS_CONFIG } from '@config/cors.config';
import { PrismaExceptionFilter } from '@filters/prisma-exception.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Global Pipes
   * helps to maintain the security of the application by validating the incoming data
   * whitelist: true will remove any additional properties that are not defined in the DTO
   * forbidNonWhitelisted: true will throw an error if there are any additional properties that are not defined in the DTO
   * transform: true will automatically transform the incoming data to the correct DTO class type (class-transformer)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // convert query params to the correct type
      },
      // TODO: add custom validation error messages (exceptionFactory)
    }),
  );

  /** Global Filters
   * PrismaExceptionFilter will catch any PrismaClientKnownRequestError exceptions
   * and transform them into appropriate HTTP exceptions
   */
  app.useGlobalFilters(new PrismaExceptionFilter());

  /** Global Interceptors
   * ClassSerializerInterceptor will automatically serialize the response objects
   * according to the @Exclude and @Expose decorators defined in the entity classes
   */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  /** Middleware to parse cookies from incoming requests */
  app.use(cookieParser());

  app.enableCors(CORS_CONFIG);

  // TODO: Add CSRF protection ? if needed (considering SameSite=strict cookies)
  // TODO: Add Helmet for setting various HTTP headers for security
  // TODO: Add rate limiting to prevent brute-force attacks
  // TODO: Set up Swagger for API documentation

  const { port } = app.get(appConfig.KEY);

  await app.listen(port);
}
bootstrap();
