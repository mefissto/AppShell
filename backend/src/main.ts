import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Global Pipes
   * helps to maintain the security of the application by validating the incoming data
   * whitelist: true will remove any additional properties that are not defined in the DTO
   * forbidNonWhitelisted: true will throw an error if there are any additional properties that are not defined in the DTO
   * transform: true will automatically transform the incoming data to the correct DTO class type
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
