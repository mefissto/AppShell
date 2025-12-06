/**
 * Base entity class providing common functionality for all entities.
 */
export abstract class BaseEntity {
  protected filterNullishValues<T extends object>(obj: Partial<T>): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null),
    ) as Partial<T>;
  }
}
