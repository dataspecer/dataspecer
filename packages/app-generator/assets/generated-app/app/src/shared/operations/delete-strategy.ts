import type { EntityModel } from '../types/aggregate.ts';
import { deleteComposite } from './composite-mutation.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import { ValidationIssueCode, type OperationResult } from './operation-result.ts';

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
          issues: [
            { code: ValidationIssueCode.MissingPayload, message: 'Delete payload is missing.' },
          ],
        };
      }
      await deleteComposite(
        ctx.datasource,
        ctx.aggregate,
        ctx.aggregateRegistry,
        ctx.payload,
        cascadePaths
      );
      return { ok: true, data: undefined };
    }

    await ctx.datasource.delete({
      aggregate: ctx.aggregate,
      id: ctx.params.id as string,
    });
    return { ok: true, data: undefined };
  }
}
