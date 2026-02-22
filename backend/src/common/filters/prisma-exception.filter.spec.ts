import { ArgumentsHost, HttpStatus } from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';
import { LoggerService } from '@loggers/app/logger.service';

import { PrismaExceptionFilter } from './prisma-exception.filter';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let logger: {
    setContext: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
  };

  const createResponse = (): MockResponse => {
    const response: MockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    return response;
  };

  const createHost = (response: MockResponse): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    }) as ArgumentsHost;

  const createKnownRequestError = (
    code: string,
    meta?: Record<string, unknown>,
    message = 'Known request error',
  ): Prisma.PrismaClientKnownRequestError => {
    const exception = Object.create(
      Prisma.PrismaClientKnownRequestError.prototype,
    ) as Prisma.PrismaClientKnownRequestError & {
      code: string;
      message: string;
      meta?: Record<string, unknown>;
      stack?: string;
    };

    exception.code = code;
    exception.message = message;
    exception.meta = meta;
    exception.stack = 'stack';

    return exception;
  };

  const createValidationError = (
    message = 'Validation failed',
  ): Prisma.PrismaClientValidationError => {
    const exception = Object.create(
      Prisma.PrismaClientValidationError.prototype,
    ) as Prisma.PrismaClientValidationError & {
      message: string;
    };

    exception.message = message;

    return exception;
  };

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    filter = new PrismaExceptionFilter(logger as unknown as LoggerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set logger context on creation', () => {
    expect(logger.setContext).toHaveBeenCalledWith('PrismaExceptionFilter');
  });

  it('should map P2002 to 409 conflict response', () => {
    const response = createResponse();
    const host = createHost(response);
    const exception = createKnownRequestError('P2002', { modelName: 'User' });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with this field already exists',
        details: {
          field: 'field',
          model: 'User',
        },
      }),
    );
  });

  it('should map connection-refused prisma codes to internal server error', () => {
    const response = createResponse();
    const host = createHost(response);
    const exception = createKnownRequestError(
      'P1001',
      undefined,
      'Cannot reach database server',
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection refused',
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Database connection refused: Cannot reach database server',
      'stack',
      'Prisma error code: P1001',
    );
  });

  it('should map unknown prisma known request errors to generic 500 response', () => {
    const response = createResponse();
    const host = createHost(response);
    const exception = createKnownRequestError('P9999', { modelName: 'Task' });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
      }),
    );
  });

  it('should map PrismaClientValidationError to 400 response', () => {
    const response = createResponse();
    const host = createHost(response);
    const exception = createValidationError();

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation error',
      }),
    );
  });
});
