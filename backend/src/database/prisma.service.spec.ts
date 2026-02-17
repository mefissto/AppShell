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

  it('should instantiate prisma service', () => {
    const service = new PrismaService({} as never);

    expect(service).toBeDefined();
    expect(prismaClientConstructorMock).toHaveBeenCalledWith({} as never);
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
