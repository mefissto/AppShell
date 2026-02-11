const prismaClientConnectMock = jest.fn();
const prismaClientExtendsMock = jest.fn().mockReturnThis();
const prismaClientConstructorMock = jest.fn();

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation((options) => ({
    adapterOptions: options,
  })),
}));

jest.mock('@generated/prisma', () => ({
  PrismaClient: class {
    constructor(options?: unknown) {
      prismaClientConstructorMock(options);
    }
    $connect = prismaClientConnectMock;
    $extends = prismaClientExtendsMock;
  },
}));

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaService, prismaServiceFactory } from './prisma.service';

describe('PrismaService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect on module init', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    prismaClientConnectMock.mockResolvedValueOnce(undefined);

    const service = new PrismaService({} as never);
    await service.onModuleInit();

    expect(prismaClientConnectMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Connected to the database');

    logSpy.mockRestore();
  });

  it('should log errors when connection fails', async () => {
    const error = new Error('connection failed');
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    prismaClientConnectMock.mockRejectedValueOnce(error);

    const service = new PrismaService({} as never);
    await service.onModuleInit();

    expect(prismaClientConnectMock).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to connect to the database',
      error,
    );

    errorSpy.mockRestore();
  });
});

describe('prismaServiceFactory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a Prisma client with extensions', () => {
    const prisma = prismaServiceFactory({ url: 'postgres://test' } as never);

    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgres://test',
    });
    expect(prismaClientConstructorMock).toHaveBeenCalledWith({
      adapter: { adapterOptions: { connectionString: 'postgres://test' } },
    });
    expect(prismaClientExtendsMock).toHaveBeenCalledTimes(3);
    expect(prisma).toBeDefined();
  });
});
