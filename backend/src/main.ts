import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import appConfig from '@config/app.config';
import { CORS_CONFIG } from '@config/cors.config';
import { SWAGGER_CONFIG } from '@config/swagger.config';
import { SWAGGER_DOCS_PATH } from '@constants/constants';
import { PrismaExceptionFilter } from '@filters/prisma-exception.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Helmet helps you secure your Express apps by setting various HTTP headers
   * Applying helmet as global or registering it must come before other calls to app.use() or setup functions that may call app.use()
   * https://docs.nestjs.com/security/helmet
   */
  app.use(helmet());

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
  // TODO: Configure HTTPS for production
  // TODO: Add logging middleware (morgan, winston, etc.) ? or use NestJS built-in Logger ? or use a custom logger ?

  const documentFactory = () =>
    SwaggerModule.createDocument(app, SWAGGER_CONFIG);
  SwaggerModule.setup(SWAGGER_DOCS_PATH, app, documentFactory);

  const { port } = app.get(appConfig.KEY);

  await app.listen(port);
}
bootstrap();
