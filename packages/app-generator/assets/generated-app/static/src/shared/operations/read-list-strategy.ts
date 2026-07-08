import type { EntityModel } from '../types/aggregate.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export class DefaultReadListStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  TModel[]
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<TModel[]>> {
    const data = await ctx.datasource.readList({
      aggregate: ctx.aggregate,
      page: numberParam(ctx.params.page),
      pageSize: numberParam(ctx.params.pageSize),
    });

    return { ok: true, data };
  }
}

function numberParam(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
