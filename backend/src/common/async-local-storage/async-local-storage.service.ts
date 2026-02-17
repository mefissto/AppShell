import { Request, Response } from 'express';
import { CLS_CTX, CLS_ID, CLS_REQ, CLS_RES, ClsService } from 'nestjs-cls';

import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  AsyncLocalStorage,
  USER_ID_KEY,
} from './interfaces/async-local-storage';

@Injectable()
export class AsyncLocalStorageService {
  constructor(private readonly cls: ClsService<AsyncLocalStorage>) {}

  set<T>(key: symbol, value: T): void {
    this.cls.set(key, value);
  }

  getUserId(): string {
    return this.cls.get(USER_ID_KEY);
  }

  getRequestId(): string {
    return this.cls.get(CLS_ID);
  }

  getRequest(): Request {
    return this.cls.get(CLS_REQ);
  }

  getResponse(): Response {
    return this.cls.get(CLS_RES);
  }

  getContext(): ExecutionContext {
    return this.cls.get(CLS_CTX);
  }
}
