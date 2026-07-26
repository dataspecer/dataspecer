import type { EntityModel } from '../types/aggregate.ts';
import { updateComposite } from './composite-mutation.ts';
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

    if (!ctx.originalPayload) {
      return {
        ok: false,
        issues: [
          {
            code: 'missing_original_payload',
            message: 'Original update payload is missing.',
          },
        ],
      };
    }

    const data = await updateComposite(
      ctx.datasource,
      ctx.aggregate,
      ctx.aggregates ?? { [ctx.aggregate.iri]: ctx.aggregate },
      ctx.payload,
      ctx.originalPayload
    );
    return { ok: true, data };
  }
}
