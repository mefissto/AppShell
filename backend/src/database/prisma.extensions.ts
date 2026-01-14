import { Prisma } from '@generated/prisma/client';

// TODO? - generalize model name 'task' to apply to all (or specific) models if needed at all
// TODO! - fix typing issues in the methods below
// TODO! - address other model operations if needed (e.g., findUniqueOrThrow, findFirstOrThrow, update, etc.)
// TODO! - add tests for these extensions
// TODO! - consider making the extensions configurable (e.g., which models to apply soft delete to)
// TODO! - removing already deleted records do not throw errors, consider throwing errors instead

/**
 * Extension to implement soft delete functionality.
 * Overrides the delete method to set a deletedAt timestamp instead of removing the record.
 */
export const softDelete = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    task: {
      async delete<M, A>(
        this: M,
        args: Prisma.Args<M, 'delete'>,
      ): Promise<Prisma.Result<M, A, 'update'>> {
        // in model API, this is the model delegate
        const delegate = Prisma.getExtensionContext(this);

        // redirect deleteMany -> updateMany to set deletedAt timestamp
        // TODO: remove any and fix typing issues below
        return (delegate as any).update({
          data: { deletedAt: new Date() }, // soft-delete marker

          // Preserve caller's arguments if provided
          where: args.where ?? {},
          select: args.select,
          include: args.include,
          omit: args.omit,
        });
      },
    },
  },
});

/**
 * Extension to implement soft delete functionality for deleteMany operations.
 * Overrides the deleteMany method to set a deletedAt timestamp instead of removing the records.
 */
export const softDeleteMany = Prisma.defineExtension({
  name: 'softDeleteMany',
  model: {
    task: {
      async deleteMany<M, A>(
        this: M,
        args: Prisma.Args<M, 'deleteMany'>,
      ): Promise<Prisma.Result<M, A, 'updateMany'>> {
        // in model API, this is the model delegate
        const delegate = Prisma.getExtensionContext(this);

        // redirect deleteMany -> updateMany to set deletedAt timestamp
        // TODO: remove any and fix typing issues below
        return (delegate as any).updateMany({
          data: { deletedAt: new Date() }, // soft-delete marker

          // Preserve caller's arguments if provided
          where: args.where ?? {},
          limit: args.limit,
        });
      },
    },
  },
});

/**
 * Extension to exclude soft-deleted records from query results.
 * Modifies findFirst, findUnique, and findMany methods to filter out records with a non-null deletedAt timestamp.
 */
export const excludeSoftDeleted = Prisma.defineExtension({
  name: 'excludeSoftDeleted',
  query: {
    task: {
      async findFirst<M, A>({
        args,
        query,
      }): Promise<Prisma.Result<M, A, 'findFirst'>> {
        args.where = { ...args.where, deletedAt: null };

        return query(args).then((record) => {
          if (record) {
            const { deletedAt, ...rest } = record;
            return rest;
          }

          return null;
        });
      },

      async findUnique<M, A>({
        args,
        query,
      }): Promise<Prisma.Result<M, A, 'findUnique'>> {
        args.where = { ...args.where, deletedAt: null };

        return query(args).then((record) => {
          if (record) {
            const { deletedAt, ...rest } = record;
            return rest;
          }

          return null;
        });
      },

      async findMany<M, A>({
        args,
        query,
      }): Promise<Prisma.Result<M, A, 'findMany'>> {
        const queryArgs = {
          ...args,
          where: { ...args.where, deletedAt: null },
        };

        const records = await query(queryArgs);

        // Remove deletedAt from the returned records
        return records.map(({ deletedAt, ...rest }) => rest);
      },
    },
  },
});
