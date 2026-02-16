import { validate } from 'class-validator';
import 'reflect-metadata';

import { AssignToProjectDto } from './assign-to-project.dto';

describe('AssignToProjectDto', () => {
  const makeDto = (overrides: Partial<AssignToProjectDto> = {}) =>
    Object.assign(new AssignToProjectDto(), overrides);

  it('passes validation when projectId is a valid CUID', async () => {
    const dto = makeDto({ projectId: 'c1234567890abcdef12345678' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails when projectId is missing', async () => {
    const dto = makeDto({});

    const errors = await validate(dto);
    const projectIdError = errors.find((e) => e.property === 'projectId');

    expect(projectIdError).toBeDefined();
  });

  it('fails when projectId is null', async () => {
    const dto = makeDto({ projectId: null });

    const errors = await validate(dto);
    const projectIdError = errors.find((e) => e.property === 'projectId');

    expect(projectIdError).toBeDefined();
  });

  it('fails when projectId is not a valid CUID', async () => {
    const dto = makeDto({ projectId: 'not-a-cuid' });

    const errors = await validate(dto);
    const projectIdError = errors.find((e) => e.property === 'projectId');

    expect(projectIdError).toBeDefined();
  });
});
