import type { ConfigType } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import appConfig from '@config/app.config';

import { BcryptHashingService } from './bcrypt-hashing.service';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

describe('BcryptHashingService', () => {
  let service: BcryptHashingService;
  let mockConfig: ConfigType<typeof appConfig>;

  beforeEach(async () => {
    mockConfig = {
      hashSaltRounds: 12,
    } as ConfigType<typeof appConfig>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BcryptHashingService,
        { provide: appConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<BcryptHashingService>(BcryptHashingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash payload using bcrypt', async () => {
    (bcrypt.genSalt as jest.Mock).mockResolvedValueOnce('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed');

    const result = await service.hash('payload');

    expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
    expect(bcrypt.hash).toHaveBeenCalledWith('payload', 'salt');
    expect(result).toBe('hashed');
  });

  it('should compare payload using bcrypt', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const result = await service.compare('payload', 'hashed');

    expect(bcrypt.compare).toHaveBeenCalledWith('payload', 'hashed');
    expect(result).toBe(true);
  });

  it('should generate a random hash', () => {
    (randomBytes as jest.Mock).mockReturnValueOnce(Buffer.from('abcd', 'hex'));

    const result = service.generateRandomHash(2);

    expect(randomBytes).toHaveBeenCalledWith(2);
    expect(result).toBe('abcd');
  });
});
