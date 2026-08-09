import type { EntityModel } from '../types/aggregate.ts';
import { deleteComposite } from './composite-mutation.ts';
import {
  stringParam,
  type OperationContext,
  type OperationStrategy,
} from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export class DefaultDeleteStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  void
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<void>> {
    const cascadePaths = ctx.cascadePaths ?? [];
    if (cascadePaths.length > 0) {
      if (!ctx.payload) {
        return {
          ok: false,
          issues: [{ code: 'missing_payload', message: 'Delete payload is missing.' }],
        };
      }
      await deleteComposite(
        ctx.datasource,
        ctx.aggregate,
        ctx.aggregates ?? { [ctx.aggregate.iri]: ctx.aggregate },
        ctx.payload,
        cascadePaths
      );
      return { ok: true, data: undefined };
    }

    await ctx.datasource.delete({
      aggregate: ctx.aggregate,
      id: stringParam(ctx.params, 'id'),
    });
    return { ok: true, data: undefined };
  }
}
