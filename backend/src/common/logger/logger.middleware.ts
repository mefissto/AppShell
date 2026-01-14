import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { LoggerService } from './logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // TODO?: think about switching to interceptors if more suitable

  constructor(private readonly logger: LoggerService) {
    logger.setContext(LoggerMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const { originalUrl: path, method } = req;
    const requestId = req.headers['x-request-id'] || randomUUID();

    this.logger.log(`${requestId} [Request]-${method} ${path}`);

    // Attach requestId to response for reference by downstream handlers
    // TODO: consider using AsyncLocalStorage to propagate requestId automatically without manual passing here
    res.locals.requestId = requestId;

    res.on('finish', () => {
      this.logger.log(
        `${requestId} [Response]-${method} ${path} - ${res.statusCode}`,
      );
    });

    next();
  }
}
