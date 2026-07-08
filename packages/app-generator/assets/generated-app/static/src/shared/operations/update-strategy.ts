import type { EntityModel } from '../types/aggregate.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export class DefaultUpdateStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  TModel
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<TModel>> {
    if (!ctx.payload) {
      return {
        ok: false,
        issues: [{ code: 'missing_payload', message: 'Update payload is missing.' }],
      };
    }

    const data = await ctx.datasource.update({
      aggregate: ctx.aggregate,
      id: JSON.stringify(ctx.params.id ?? ''),
      payload: ctx.payload,
    });
    return { ok: true, data };
  }
}
