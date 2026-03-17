import type { EntityModel } from '../types/aggregate.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export class DefaultCreateStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  TModel
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<TModel>> {
    if (!ctx.payload) {
      return {
        ok: false,
        issues: [{ code: 'missing_payload', message: 'Create payload is missing.' }],
      };
    }

    const data = await ctx.datasource.create({
      aggregate: ctx.aggregate,
      payload: ctx.payload,
    });
    return { ok: true, data };
  }
}
