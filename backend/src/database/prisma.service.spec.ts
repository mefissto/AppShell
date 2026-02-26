const prismaClientConnectMock = jest.fn();
const prismaClientExtendsMock = jest.fn().mockReturnThis();
const prismaClientConstructorMock = jest.fn();
const prismaDefineExtensionMock = jest
  .fn()
  .mockImplementation((extension) => extension);
const prismaGetExtensionContextMock = jest.fn();

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation((options) => ({
    adapterOptions: options,
  })),
}));

function createPrismaClientModuleMock() {
  class PrismaClient {
    constructor(options?: unknown) {
      prismaClientConstructorMock(options);
    }
    $connect = prismaClientConnectMock;
    $extends = prismaClientExtendsMock;
  }

  return {
    __esModule: true,
    PrismaClient,
    default: {
      PrismaClient,
    },
  };
}

jest.mock('@generated/prisma', createPrismaClientModuleMock);
jest.mock('@generated/prisma/index', createPrismaClientModuleMock);
jest.mock('../../generated/prisma', createPrismaClientModuleMock);
jest.mock('../../generated/prisma/index', createPrismaClientModuleMock);

function createPrismaClientNamespaceMock() {
  class PrismaClient {
    constructor(options?: unknown) {
      prismaClientConstructorMock(options);
    }
    $connect = prismaClientConnectMock;
    $extends = prismaClientExtendsMock;
  }

  return {
    Prisma: {
      defineExtension: prismaDefineExtensionMock,
      getExtensionContext: prismaGetExtensionContextMock,
    },
    PrismaClient,
  };
}

jest.mock('@generated/prisma/client', createPrismaClientNamespaceMock);
jest.mock('../../generated/prisma/client', createPrismaClientNamespaceMock);

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaService, prismaServiceFactory } = require('./prisma.service');

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
