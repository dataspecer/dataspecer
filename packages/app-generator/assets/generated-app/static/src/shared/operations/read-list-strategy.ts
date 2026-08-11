import type { EntityModel } from '../types/aggregate.ts';
import {
  DEFAULT_READ_LIST_SORT,
  type ReadListResult,
  type ReadListSort,
} from '../datasource/data-source.ts';
import type { OperationContext, OperationStrategy } from './operation-strategy.ts';
import type { OperationResult } from './operation-result.ts';

export const DEFAULT_PAGE_SIZE = 20;

interface ReadListParams {
  page?: number;
  pageSize?: number;
  sort?: ReadListSort;
}

export class DefaultReadListStrategy<TModel extends EntityModel> implements OperationStrategy<
  TModel,
  ReadListResult<TModel>
> {
  async execute(ctx: OperationContext<TModel>): Promise<OperationResult<ReadListResult<TModel>>> {
    const params = ctx.params as ReadListParams;
    const data = await ctx.datasource.readList({
      aggregate: ctx.aggregate,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      sort: params.sort ?? DEFAULT_READ_LIST_SORT,
    });

    return { ok: true, data };
  }
}
