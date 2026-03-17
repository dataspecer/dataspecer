import { describe, expect, it } from 'vitest';

import { buildGenerationModel } from '../src/generation-model/build-generation-model.ts';
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
} from '../src/graph/types.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';
import { FieldKind } from '../src/metadata/types.ts';

describe('buildGenerationModel', () => {
  it('builds a deterministic generation model', () => {
    const graph = graphFixture();

    const first = buildGenerationModel(graph, basicMetadata);
    const second = buildGenerationModel(graphFixture(), basicMetadata);

    expect(first).toEqual(second);
  });

  it('describes app, datasource, operations, routes, navigation, and redirects', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);

    expect(model.app).toEqual({
      name: 'Library application',
      safeName: 'library-application',
      dataSpecificationIri: specificationIri,
    });
    expect(model.datasource).toEqual({
      id: 'main-rdf',
      type: DatasourceType.Rdf,
      endpoint: 'https://example.org/sparql',
    });
    expect(model.operations.map((operation) => operation.id)).toEqual([
      'Book.Create',
      'Book.Delete',
      'Book.ReadDetail',
      'Book.ReadList',
      'Book.Update',
    ]);
    expect(model.routes).toContainEqual(
      expect.objectContaining({
        id: 'book-read-detail',
        path: '/book-read-detail/:id',
        pageComponentName: 'BookReadDetailPage',
      })
    );
    expect(model.navigation).toEqual([
      {
        id: 'detail-delete',
        sourceOperationId: 'Book.ReadDetail',
        targetOperationId: 'Book.Delete',
        sourceNodeId: 'Book.ReadDetail',
        targetNodeId: 'Book.Delete',
      },
      {
        id: 'detail-update',
        sourceOperationId: 'Book.ReadDetail',
        targetOperationId: 'Book.Update',
        sourceNodeId: 'Book.ReadDetail',
        targetNodeId: 'Book.Update',
      },
      {
        id: 'list-detail',
        sourceOperationId: 'Book.ReadList',
        targetOperationId: 'Book.ReadDetail',
        sourceNodeId: 'Book.ReadList',
        targetNodeId: 'Book.ReadDetail',
      },
    ]);
    expect(model.redirects).toEqual([
      {
        id: 'create-list',
        sourceOperationId: 'Book.Create',
        targetOperationId: 'Book.ReadList',
        sourceNodeId: 'Book.Create',
        targetNodeId: 'Book.ReadList',
      },
      {
        id: 'delete-list',
        sourceOperationId: 'Book.Delete',
        targetOperationId: 'Book.ReadList',
        sourceNodeId: 'Book.Delete',
        targetNodeId: 'Book.ReadList',
      },
      {
        id: 'update-detail',
        sourceOperationId: 'Book.Update',
        targetOperationId: 'Book.ReadDetail',
        sourceNodeId: 'Book.Update',
        targetNodeId: 'Book.ReadDetail',
      },
    ]);
  });

  it('creates read descriptors from aggregate fields', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);
    const readList = model.operations.find((operation) => operation.id === 'Book.ReadList');
    const readDetail = model.operations.find((operation) => operation.id === 'Book.ReadDetail');

    expect(readList?.list?.columns).toEqual([
      expect.objectContaining({
        path: 'author',
        kind: FieldKind.Association,
        targetClassIri: 'https://example.org/class/author',
      }),
      expect.objectContaining({
        path: 'title',
        kind: FieldKind.Primitive,
        datatype: 'string',
      }),
    ]);
    expect(readDetail?.detail?.fields).toEqual([
      expect.objectContaining({ path: 'author' }),
      expect.objectContaining({ path: 'chapters' }),
      expect.objectContaining({ path: 'title' }),
    ]);
  });
});

function graphFixture(): ApplicationGraph {
  return {
    name: 'Library application',
    dataSpecificationIri: specificationIri,
    datasources: [
      {
        id: 'main-rdf',
        type: DatasourceType.Rdf,
        endpoint: 'https://example.org/sparql',
      },
    ],
    nodes: [
      node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList, {
        pageTitle: 'Books',
      }),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
      node('Book.Create', 'https://example.org/aggregate/book-form', Operation.Create),
      node('Book.Update', 'https://example.org/aggregate/book-form', Operation.Update),
      node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
        delete: { chapters: 'cascade' },
      }),
    ],
    edges: [
      {
        id: 'list-detail',
        source: 'Book.ReadList',
        target: 'Book.ReadDetail',
        type: EdgeType.Transition,
      },
      {
        id: 'detail-update',
        source: 'Book.ReadDetail',
        target: 'Book.Update',
        type: EdgeType.Transition,
      },
      {
        id: 'detail-delete',
        source: 'Book.ReadDetail',
        target: 'Book.Delete',
        type: EdgeType.Transition,
      },
      {
        id: 'create-list',
        source: 'Book.Create',
        target: 'Book.ReadList',
        type: EdgeType.Redirect,
      },
      {
        id: 'update-detail',
        source: 'Book.Update',
        target: 'Book.ReadDetail',
        type: EdgeType.Redirect,
      },
      {
        id: 'delete-list',
        source: 'Book.Delete',
        target: 'Book.ReadList',
        type: EdgeType.Redirect,
      },
    ],
  };
}

function node(
  id: string,
  aggregateIri: string,
  operation: ApplicationNode['operation'],
  config?: Record<string, unknown>
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
    ...(config ? { config } : {}),
  };
}
