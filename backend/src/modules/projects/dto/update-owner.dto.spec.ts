import { validate } from 'class-validator';
import 'reflect-metadata';

import { UpdateOwnerDto } from './update-owner.dto';

describe('UpdateOwnerDto', () => {
  const makeDto = (overrides: Partial<UpdateOwnerDto> = {}) =>
    Object.assign(new UpdateOwnerDto(), overrides);

  it('passes validation when ownerId is a valid CUID', async () => {
    const dto = makeDto({ ownerId: 'c1234567890abcdef12345678' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails when ownerId is missing', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);
    const ownerIdError = errors.find((e) => e.property === 'ownerId');

    expect(ownerIdError).toBeDefined();
  });

  it('fails when ownerId is not a valid CUID', async () => {
    const dto = makeDto({ ownerId: 'not-a-cuid' });

    const errors = await validate(dto);
    const ownerIdError = errors.find((e) => e.property === 'ownerId');

    expect(ownerIdError).toBeDefined();
  });
});
