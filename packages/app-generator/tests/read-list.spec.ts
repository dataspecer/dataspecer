import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_READ_LIST_SORT,
  DataSourceKind,
  type DataSource,
  type ReadListSort,
  type ReadListResult,
} from '../assets/generated-app/app/src/shared/datasource/data-source.ts';
import {
  DEFAULT_PAGE_SIZE,
  DefaultReadListStrategy,
} from '../assets/generated-app/app/src/shared/operations/read-list-strategy.ts';
import type { OperationContext } from '../assets/generated-app/app/src/shared/operations/operation-strategy.ts';
import type {
  AggregateDescriptor,
  EntityModel,
} from '../assets/generated-app/app/src/shared/types/aggregate.ts';

interface TestModel extends EntityModel {
  title?: string;
}

const aggregate: AggregateDescriptor<TestModel> = {
  iri: 'https://example.org/aggregate/book',
  name: 'Book',
  classIri: 'https://example.org/class/book',
  fields: [
    {
      path: 'title',
      propertyName: 'title',
      label: 'Title',
      kind: 'primitive',
      propertyIri: 'https://example.org/property/title',
      datatype: 'http://www.w3.org/2001/XMLSchema#string',
      formControl: 'text',
      many: false,
      required: false,
    },
  ],
  createEmpty: () => ({}),
};

describe('DefaultReadListStrategy', () => {
  it('passes the requested page to the datasource and returns its result', async () => {
    const data: ReadListResult<TestModel> = {
      items: [{ id: 'https://example.org/book/21', title: 'Book 21' }],
      total: 42,
    };
    const readList = vi.fn().mockResolvedValue(data);
    const strategy = new DefaultReadListStrategy<TestModel>();
    const sort: ReadListSort = { kind: 'field', fieldPath: 'title', direction: 'desc' };

    const result = await strategy.execute(context({ readList }, { page: 3, pageSize: 10, sort }));

    expect(readList).toHaveBeenCalledWith({ aggregate, page: 3, pageSize: 10, sort });
    expect(result).toEqual({ ok: true, data });
  });

  it('uses the first page and default page size when pagination is omitted', async () => {
    const readList = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const strategy = new DefaultReadListStrategy<TestModel>();

    await strategy.execute(context({ readList }, {}));

    expect(readList).toHaveBeenCalledWith({
      aggregate,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: DEFAULT_READ_LIST_SORT,
    });
  });
});

function context(
  datasource: Pick<DataSource, 'readList'>,
  params: Record<string, unknown>
): OperationContext<TestModel> {
  return {
    aggregate,
    aggregateRegistry: { [aggregate.iri]: aggregate },
    datasource: {
      kind: DataSourceKind.Rdf,
      ...datasource,
    } as DataSource,
    params,
  };
}
