import type { EntityModel } from '../types/aggregate.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export class DefaultDeleteStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  void
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<void>> {
    await ctx.datasource.delete({
      aggregate: ctx.aggregate,
      id: JSON.stringify(ctx.params.id ?? ''),
    });
    return { ok: true, data: undefined };
  }
}
