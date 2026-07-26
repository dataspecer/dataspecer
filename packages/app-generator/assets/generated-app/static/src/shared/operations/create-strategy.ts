import type { EntityModel } from '../types/aggregate.ts';
import { createComposite } from './composite-mutation.ts';
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

    const data = await createComposite(
      ctx.datasource,
      ctx.aggregate,
      ctx.aggregates ?? { [ctx.aggregate.iri]: ctx.aggregate },
      ctx.payload
    );
    return { ok: true, data };
  }
}
