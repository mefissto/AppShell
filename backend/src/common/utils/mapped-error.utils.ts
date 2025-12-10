import { MappedError } from '@prisma/driver-adapter-utils';

/**
 * Extract constraint fields from MappedError based on kind
 */
export type ExtractConstraintFields<T extends MappedError> = T extends
  | { kind: 'UniqueConstraintViolation'; constraint?: infer C }
  | { kind: 'NullConstraintViolation'; constraint?: infer C }
  | { kind: 'ForeignKeyConstraintViolation'; constraint?: infer C }
  ? C extends { fields: infer F }
    ? F extends string[]
      ? F
      : []
    : []
  : [];

/**
 * Type-safe accessor for MappedError constraint fields
 */
export function getConstraintFields(error: MappedError): string[] {
  if (
    (error.kind === 'UniqueConstraintViolation' ||
      error.kind === 'NullConstraintViolation' ||
      error.kind === 'ForeignKeyConstraintViolation') &&
    error.constraint &&
    'fields' in error.constraint &&
    Array.isArray(error.constraint.fields)
  ) {
    return error.constraint.fields;
  }
  return [];
}
