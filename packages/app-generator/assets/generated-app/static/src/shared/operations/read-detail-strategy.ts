import type { EntityModel } from '../types/aggregate.ts';
import {
  stringParam,
  type OperationContext,
  type OperationStrategy,
} from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export class DefaultReadDetailStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  TModel
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<TModel>> {
    const id = stringParam(ctx.params, 'id');
    const data = await ctx.datasource.readDetail({
      aggregate: ctx.aggregate,
      id,
    });

    return data
      ? { ok: true, data }
      : {
          ok: false,
          issues: [{ code: 'not_found', message: 'Entity not found.' }],
        };
  }
}
