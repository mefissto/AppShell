import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  DriverAdapterError,
  type MappedError,
} from '@prisma/driver-adapter-utils';
import { Response } from 'express';

import { Prisma } from '@generated/prisma/client';
import {
  ErrorDetails,
  ErrorResponse,
} from '@interfaces/error-response.interface';
import { getConstraintFields } from '@utils/mapped-error.utils';
/**
 * Global exception filter to handle all Prisma errors and convert them to appropriate HTTP responses.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientRustPanicError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, message, details } = this.handlePrismaError(exception);

      response.status(status).json({
        statusCode: status,
        message,
        ...(details && Object.keys(details).length > 0 && { details }),
        timestamp: Date.now(),
      });
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error('Prisma validation error:', exception.message);

      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation error',
        timestamp: Date.now(),
      });
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error('Prisma initialization error:', exception.message);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection error',
        timestamp: Date.now(),
      });
    } else {
      // PrismaClientUnknownRequestError or PrismaClientRustPanicError
      this.logger.error('Unexpected Prisma error:', exception.message);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle specific Prisma error codes and return appropriate HTTP status and message
   */
  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    switch (exception.code) {
      case 'P2002':
        return this.handleUniqueConstraintViolation(exception);

      case 'P2025':
        return this.handleRecordNotFound(exception);

      case 'P2003':
        return this.handleForeignKeyViolation(exception);

      case 'P2014':
        return this.handleRelationViolation(exception);

      case 'P2000':
        return this.handleValueTooLong(exception);

      case 'P2001':
        return this.handleRelatedRecordNotFound(exception);

      case 'P2011':
        return this.handleNullConstraintViolation(exception);

      case 'P2012':
        return this.handleMissingRequiredValue(exception);

      case 'P2015':
        return this.handleLazyRelationLoadingViolation(exception);

      default:
        this.logger.error('Unhandled Prisma error:', {
          code: exception.code,
          message: exception.message,
          meta: exception.meta,
        });

        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
        };
    }
  }

  /**
   * Extract constraint fields from driver adapter error
   */
  private extractConstraintFields(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string[] {
    const driverError = exception.meta?.driverAdapterError as
      | DriverAdapterError
      | undefined;

    console.log(driverError);
    const cause: MappedError | undefined = driverError?.cause;

    return cause ? getConstraintFields(cause) : [];
  }

  /**
   * Safely extract string value from meta object
   */
  private getMetaString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private handleUniqueConstraintViolation(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const constraintFields = this.extractConstraintFields(exception);
    const field = constraintFields[0] ?? 'field';

    const details: ErrorDetails = {
      field,
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn(`Unique constraint violation on ${field}`, {
      code: exception.code,
      model: details.model,
    });

    return {
      status: HttpStatus.CONFLICT,
      message: `A record with this ${field} already exists`,
      details,
    };
  }

  private handleRecordNotFound(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn('Record not found', { model: details.model });

    return {
      status: HttpStatus.NOT_FOUND,
      message: 'Record not found',
      details,
    };
  }

  private handleForeignKeyViolation(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      field: this.getMetaString(exception.meta?.field_name),
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn(`Foreign key violation on ${details.field}`, {
      model: details.model,
    });

    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Foreign key constraint failed',
      details,
    };
  }

  private handleRelationViolation(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      model: this.getMetaString(exception.meta?.modelName),
      relationName: this.getMetaString(exception.meta?.relation_name),
    };

    this.logger.warn('Relation violation', {
      model: details.model,
      relation: details.relationName,
    });

    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'The change would violate a required relation',
      details,
    };
  }

  private handleValueTooLong(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      field: this.getMetaString(exception.meta?.column_name),
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn(`Value too long for field ${details.field}`, {
      model: details.model,
    });

    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Value is too long for the field',
      details,
    };
  }

  private handleRelatedRecordNotFound(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn('Related record not found', { model: details.model });

    return {
      status: HttpStatus.NOT_FOUND,
      message: 'Related record not found',
      details,
    };
  }

  private handleNullConstraintViolation(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      field: this.getMetaString(exception.meta?.column_name),
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn(`Null constraint violation on ${details.field}`, {
      model: details.model,
    });

    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Required field is missing',
      details,
    };
  }

  private handleMissingRequiredValue(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      model: this.getMetaString(exception.meta?.modelName),
    };

    this.logger.warn('Missing required value', { model: details.model });

    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'A required value is missing',
      details,
    };
  }

  private handleLazyRelationLoadingViolation(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ErrorResponse {
    const details: ErrorDetails = {
      model: this.getMetaString(exception.meta?.modelName),
      relationName: this.getMetaString(exception.meta?.relation_name),
    };

    this.logger.warn('Lazy relation loading violation', {
      model: details.model,
      relation: details.relationName,
    });

    return {
      status: HttpStatus.NOT_FOUND,
      message: 'Related record not found',
      details,
    };
  }
}
