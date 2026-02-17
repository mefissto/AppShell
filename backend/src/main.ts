import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { RequestValidationPipe } from '@common/pipes/request-validation.pipe';
import appConfig from '@config/app.config';
import { CORS_CONFIG } from '@config/cors.config';
import { SWAGGER_CONFIG } from '@config/swagger.config';
import { SWAGGER_DOCS_PATH } from '@constants/constants';
import { PrismaExceptionFilter } from '@filters/prisma-exception.filter';
import { LoggerService } from '@loggers/app/logger.service';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = await app.resolve(LoggerService);
  const reflector = app.get(Reflector);

  /**
   * Helmet helps you secure your Express apps by setting various HTTP headers
   * Applying helmet as global or registering it must come before other calls to app.use() or setup functions that may call app.use()
   * https://docs.nestjs.com/security/helmet
   */
  app.use(helmet());

  /**
   * Global Pipes
   *
   * RequestValidationPipe is a custom pipe that applies different validation strategies based on the source of the argument (body, query, param).
   * This allows us to have strict validation for request bodies while enabling convenient implicit conversion for query parameters and route parameters.
   * The pipe is applied globally, so it will be used for all incoming requests to validate the data against the defined DTOs.
   */
  app.useGlobalPipes(new RequestValidationPipe());

  /** Global Filters
   * PrismaExceptionFilter will catch any PrismaClientKnownRequestError exceptions
   * and transform them into appropriate HTTP exceptions
   */
  app.useGlobalFilters(new PrismaExceptionFilter(logger));

  /** Global Interceptors
   * ClassSerializerInterceptor will automatically serialize the response objects
   * according to the @Exclude and @Expose decorators defined in the entity classes
   */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  /** Middleware to parse cookies from incoming requests */
  app.use(cookieParser());

  app.useLogger(logger);

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
