import type { EntityModel } from '../types/aggregate.ts';
import { createComposite } from './composite-mutation.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import { ValidationIssueCode, type OperationResult } from './operation-result.ts';

export class DefaultCreateStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  TModel
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<TModel>> {
    if (!ctx.payload) {
      return {
        ok: false,
        issues: [
          { code: ValidationIssueCode.MissingPayload, message: 'Create payload is missing.' },
        ],
      };
    }

    const data = await createComposite(
      ctx.datasource,
      ctx.aggregate,
      ctx.aggregateRegistry,
      ctx.payload,
    );
    return { ok: true, data };
  }
}
