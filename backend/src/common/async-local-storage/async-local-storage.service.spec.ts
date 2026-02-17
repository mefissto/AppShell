import { ExecutionContext } from '@nestjs/common';
import { Request, Response } from 'express';
import { CLS_CTX, CLS_ID, CLS_REQ, CLS_RES, ClsService } from 'nestjs-cls';

import { AsyncLocalStorageService } from './async-local-storage.service';
import { USER_ID_KEY } from './interfaces/async-local-storage';

describe('AsyncLocalStorageService', () => {
  let cls: { set: jest.Mock; get: jest.Mock };
  let service: AsyncLocalStorageService;

  beforeEach(() => {
    cls = {
      set: jest.fn(),
      get: jest.fn(),
    };
    service = new AsyncLocalStorageService(cls as unknown as ClsService<never>);
  });

  it('should delegate set to cls service', () => {
    const key = Symbol('test-key');
    const value = 'test-value';

    service.set(key, value);

    expect(cls.set).toHaveBeenCalledWith(key, value);
  });

  it('should return user id from cls store', () => {
    cls.get.mockReturnValueOnce('user-1');

    const result = service.getUserId();

    expect(cls.get).toHaveBeenCalledWith(USER_ID_KEY);
    expect(result).toBe('user-1');
  });

  it('should return request id from cls store', () => {
    cls.get.mockReturnValueOnce('req-1');

    const result = service.getRequestId();

    expect(cls.get).toHaveBeenCalledWith(CLS_ID);
    expect(result).toBe('req-1');
  });

  it('should return request from cls store', () => {
    const request = { headers: {} } as Request;
    cls.get.mockReturnValueOnce(request);

    const result = service.getRequest();

    expect(cls.get).toHaveBeenCalledWith(CLS_REQ);
    expect(result).toBe(request);
  });

  it('should return response from cls store', () => {
    const response = {} as Response;
    cls.get.mockReturnValueOnce(response);

    const result = service.getResponse();

    expect(cls.get).toHaveBeenCalledWith(CLS_RES);
    expect(result).toBe(response);
  });

  it('should return execution context from cls store', () => {
    const context = {} as ExecutionContext;
    cls.get.mockReturnValueOnce(context);

    const result = service.getContext();

    expect(cls.get).toHaveBeenCalledWith(CLS_CTX);
    expect(result).toBe(context);
  });
});
