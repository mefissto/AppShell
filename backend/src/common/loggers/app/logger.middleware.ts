import { Injectable, NestMiddleware } from '@nestjs/common';
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

    this.logger.log(`[Request]-${method} ${path}`);

    res.on('finish', () => {
      this.logger.log(`[Response]-${method} ${path} - ${res.statusCode}`);
    });

    next();
  }
}
