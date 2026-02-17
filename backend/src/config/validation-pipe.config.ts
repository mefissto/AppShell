import { ValidationPipeOptions } from '@nestjs/common';

/**
 * Default Validation Pipe configuration for the application.
 *
 * This configuration is used to validate incoming requests and ensure that they conform to the expected DTOs.
 * helps to maintain the security of the application by validating the incoming data
 * whitelist: true will remove any additional properties that are not defined in the DTO
 * forbidNonWhitelisted: true will throw an error if there are any additional properties that are not defined in the DTO
 * transform: true will automatically transform the incoming data to the correct DTO class type (class-transformer)
 */
export const VALIDATION_PIPE_CONFIG: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: false,
  },
  // TODO: add custom validation error messages (exceptionFactory)
};
