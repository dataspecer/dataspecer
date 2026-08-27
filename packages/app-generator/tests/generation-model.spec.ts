import { describe, expect, it } from 'vitest';

import { buildGenerationModel } from '../src/generation-model/build-generation-model.ts';
import {
  AssociationKind,
  DatasourceType,
  DeletePolicy,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
  type ApplicationNodeConfig,
} from '../src/graph/types.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';
import { FieldKind } from '../src/metadata/types.ts';
import { analyzeGraphSemantics } from '../src/validation/analyze-semantics.ts';
import { toOperationClassName } from '../src/utils/naming.ts';

describe('buildGenerationModel', () => {
  it('builds a deterministic generation model', () => {
    const graph = graphFixture();

    const first = buildGenerationModel(graph, preparedMetadataFor(graph));
    const secondGraph = graphFixture();
    const second = buildGenerationModel(secondGraph, preparedMetadataFor(secondGraph));

    expect(first).toEqual(second);
  });

  it('describes app, datasource, operations, navigation, and redirects', () => {
    const graph = graphFixture();
    const model = buildGenerationModel(graph, preparedMetadataFor(graph));

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
    expect(model.operations).toContainEqual(
      expect.objectContaining({
        id: 'Book.ReadDetail',
        routeId: 'book-read-detail',
        path: '/book-read-detail',
        pageComponentName: 'BookReadDetailPage',
        requiresEntityId: true,
      }),
    );
    expect(model.navigation).toEqual([
      {
        id: 'detail-delete',
        sourceOperationId: 'Book.ReadDetail',
        targetOperationId: 'Book.Delete',
      },
      {
        id: 'detail-update',
        sourceOperationId: 'Book.ReadDetail',
        targetOperationId: 'Book.Update',
      },
      {
        id: 'list-detail',
        sourceOperationId: 'Book.ReadList',
        targetOperationId: 'Book.ReadDetail',
      },
    ]);
    expect(model.redirects).toEqual([
      {
        id: 'create-list',
        sourceOperationId: 'Book.Create',
        targetOperationId: 'Book.ReadList',
      },
      {
        id: 'delete-list',
        sourceOperationId: 'Book.Delete',
        targetOperationId: 'Book.ReadList',
      },
      {
        id: 'update-detail',
        sourceOperationId: 'Book.Update',
        targetOperationId: 'Book.ReadDetail',
      },
    ]);

    expect(
      model.operations.find((operation) => operation.id === 'Book.Create')?.navigation
        .successRedirect,
    ).toEqual({
      id: 'create-list',
      label: 'List',
      operation: 'ReadList',
      targetTitle: expect.any(String),
      targetPath: '/book-read-list',
      requiresEntityId: false,
    });
    expect(
      model.operations.find((operation) => operation.id === 'Book.Update')?.navigation
        .successRedirect,
    ).toEqual({
      id: 'update-detail',
      label: 'Detail',
      operation: 'ReadDetail',
      targetTitle: expect.any(String),
      targetPath: '/book-read-detail',
      requiresEntityId: true,
    });
    expect(
      model.operations.find((operation) => operation.id === 'Book.Delete')?.navigation
        .successRedirect,
    ).toEqual({
      id: 'delete-list',
      label: 'List',
      operation: 'ReadList',
      targetTitle: expect.any(String),
      targetPath: '/book-read-list',
      requiresEntityId: false,
    });
    expect(model.operations.find((operation) => operation.id === 'Book.Delete')?.delete).toEqual({
      cascadePaths: ['chapters'],
    });
  });

  it('falls back to a same-class list when a write has no configured redirect', () => {
    const graph = graphFixture();
    graph.edges = graph.edges.filter((edge) => edge.type !== EdgeType.Redirect);

    const model = buildGenerationModel(graph, preparedMetadataFor(graph));
    const create = model.operations.find((operation) => operation.id === 'Book.Create');

    expect(create?.navigation.successRedirect).toEqual({
      id: 'Book.Create:success:Book.ReadList',
      label: 'Back to list',
      operation: 'ReadList',
      targetTitle: expect.any(String),
      targetPath: '/book-read-list',
      requiresEntityId: false,
    });
  });

  it('marks a configured Create to ReadDetail redirect as requiring the new entity id', () => {
    const graph = graphFixture();
    graph.edges = graph.edges.map((edge) =>
      edge.id === 'create-list'
        ? {
            ...edge,
            id: 'create-detail',
            target: 'Book.ReadDetail',
          }
        : edge,
    );

    const model = buildGenerationModel(graph, preparedMetadataFor(graph));
    const create = model.operations.find((operation) => operation.id === 'Book.Create');

    expect(create?.navigation.successRedirect).toEqual({
      id: 'create-detail',
      label: 'Detail',
      operation: 'ReadDetail',
      targetTitle: expect.any(String),
      targetPath: '/book-read-detail',
      requiresEntityId: true,
    });
  });

  it('strips diacritics from generated identifiers', () => {
    const graph = graphFixture();
    graph.nodes = [node('Cíl.ReadList', 'https://example.org/aggregate/cil', Operation.ReadList)];
    graph.edges = [];
    const model = buildGenerationModel(graph, {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'https://example.org/aggregate/cil',
          name: 'Turistický cíl',
          classIri: 'https://example.org/class/cil',
          fields: [
            {
              path: 'má_url',
              label: 'Má URL',
              kind: FieldKind.Primitive,
              datatype: 'string',
            },
          ],
        },
      ],
    });

    expect(model.aggregates[0].safeName).toBe('TuristickyCil');
    expect(model.operations[0].routeId).toBe('cil-read-list');
    expect(model.operations[0].pageComponentName).toBe('CilReadListPage');
  });

  it('prefixes generated TypeScript identifiers that start with a number', () => {
    const graph = graphFixture();
    graph.nodes = [
      node('123 Books.ReadList', 'https://example.org/aggregate/numeric', Operation.ReadList),
    ];
    graph.edges = [];
    const model = buildGenerationModel(graph, {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'https://example.org/aggregate/numeric',
          name: '123 Books',
          classIri: 'https://example.org/class/book',
          fields: [],
        },
      ],
    });

    expect(model.aggregates[0].safeName).toBe('_123Books');
    expect(model.operations[0].pageComponentName).toBe('_123BooksReadListPage');
    expect(toOperationClassName(model.operations[0].id)).toBe('_123BooksReadListOperation');
  });

  it('resolves association kinds from graph association config', () => {
    const graph = graphFixture();
    const model = buildGenerationModel(graph, preparedMetadataFor(graph));
    const bookDetail = model.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail',
    );

    const chapters = bookDetail?.fields.find((field) => field.path === 'chapters');
    expect(chapters).toMatchObject({
      associationKind: AssociationKind.Composition,
    });
    expect(bookDetail?.fields.find((field) => field.path === 'author')).toMatchObject({
      associationKind: AssociationKind.Aggregation,
    });
    expect(chapters?.fields?.find((field) => field.path === 'editor')).toMatchObject({
      associationKind: AssociationKind.Aggregation,
    });
    const chapterDetail = model.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/chapter-detail',
    );
    expect(chapterDetail?.fields.find((field) => field.path === 'editor')?.associationKind).toBe(
      AssociationKind.Aggregation,
    );
  });

  it('classifies transitions into operation navigation descriptors', () => {
    const graph = graphFixture();
    graph.nodes = [
      node('BookNested.ReadList', 'https://example.org/aggregate/book-detail', Operation.ReadList),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
      node('Book.Create', 'https://example.org/aggregate/book-form', Operation.Create),
      node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
        associations: {
          chapters: AssociationKind.Composition,
          author: AssociationKind.Aggregation,
          'chapters.editor': AssociationKind.Aggregation,
        },
      }),
      node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete),
      node(
        'Author.ReadDetail',
        'https://example.org/aggregate/author-detail',
        Operation.ReadDetail,
      ),
    ];
    graph.edges = [
      transition('list-create', 'BookNested.ReadList', 'Book.Create'),
      transition('list-detail', 'BookNested.ReadList', 'Book.ReadDetail'),
      transition('list-update', 'BookNested.ReadList', 'Book.Update'),
      transition('list-delete', 'BookNested.ReadList', 'Book.Delete'),
      transition('list-author-detail', 'BookNested.ReadList', 'Author.ReadDetail'),
      transition('detail-list', 'Book.ReadDetail', 'BookNested.ReadList'),
      transition('detail-update', 'Book.ReadDetail', 'Book.Update'),
      transition('detail-delete', 'Book.ReadDetail', 'Book.Delete'),
      transition('detail-author-detail', 'Book.ReadDetail', 'Author.ReadDetail'),
    ];

    const model = buildGenerationModel(graph, preparedMetadataFor(graph));
    const list = model.operations.find((operation) => operation.id === 'BookNested.ReadList');
    const detail = model.operations.find((operation) => operation.id === 'Book.ReadDetail');

    expect(list?.navigation.pageActions).toEqual([
      {
        id: 'list-create',
        label: 'Create',
        operation: 'Create',
        targetTitle: expect.any(String),
        targetPath: '/book-create',
        requiresEntityId: false,
      },
    ]);
    // read, then write, destructive last, whatever order the graph edges happen to have
    expect(list?.navigation.rowActions).toEqual([
      {
        id: 'list-detail',
        label: 'Detail',
        operation: 'ReadDetail',
        targetTitle: expect.any(String),
        targetPath: '/book-read-detail',
        requiresEntityId: true,
      },
      {
        id: 'list-update',
        label: 'Edit',
        operation: 'Update',
        targetTitle: expect.any(String),
        targetPath: '/book-update',
        requiresEntityId: true,
      },
      {
        id: 'list-delete',
        label: 'Delete',
        operation: 'Delete',
        targetTitle: expect.any(String),
        targetPath: '/book-delete',
        requiresEntityId: true,
      },
    ]);
    expect(list?.navigation.associationActions).toEqual([
      {
        id: 'list-author-detail:author',
        fieldPath: 'author',
        targetPath: '/author-read-detail',
        requiresEntityId: true,
      },
    ]);

    expect(detail?.navigation.pageActions).toEqual([
      {
        id: 'detail-list',
        label: 'List',
        operation: 'ReadList',
        targetTitle: expect.any(String),
        targetPath: '/book-nested-read-list',
        requiresEntityId: false,
      },
      {
        id: 'detail-update',
        label: 'Edit',
        operation: 'Update',
        targetTitle: expect.any(String),
        targetPath: '/book-update',
        requiresEntityId: true,
      },
      {
        id: 'detail-delete',
        label: 'Delete',
        operation: 'Delete',
        targetTitle: expect.any(String),
        targetPath: '/book-delete',
        requiresEntityId: true,
      },
    ]);
    // association actions follow the fields of the aggregate, which are in the order the data
    // structure declares them, and BookDetail declares chapters before author
    expect(detail?.navigation.associationActions).toEqual([
      {
        id: 'detail-author-detail:chapters.editor',
        fieldPath: 'chapters.editor',
        targetPath: '/author-read-detail',
        requiresEntityId: true,
      },
      {
        id: 'detail-author-detail:author',
        fieldPath: 'author',
        targetPath: '/author-read-detail',
        requiresEntityId: true,
      },
    ]);
  });

  it('creates association navigation for an aggregate target without target class metadata', () => {
    const sourceAggregateIri = 'urn:aggregate:source';
    const targetAggregateIri = 'urn:aggregate:target';
    const graph: ApplicationGraph = {
      name: 'Aggregate target navigation',
      dataSpecificationIri: specificationIri,
      datasources: [
        {
          id: 'main-rdf',
          type: DatasourceType.Rdf,
          endpoint: 'https://example.org/sparql',
        },
      ],
      nodes: [
        node('Source.ReadList', sourceAggregateIri, Operation.ReadList),
        node('Target.ReadDetail', targetAggregateIri, Operation.ReadDetail),
      ],
      edges: [transition('source-target', 'Source.ReadList', 'Target.ReadDetail')],
    };
    const metadata = {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: sourceAggregateIri,
          name: 'Source',
          classIri: 'urn:class:source',
          fields: [
            {
              path: 'target',
              label: 'Target',
              kind: FieldKind.Association,
              targetAggregateIri,
            },
          ],
        },
        {
          iri: targetAggregateIri,
          name: 'Target',
          classIri: 'urn:class:target',
          fields: [],
        },
      ],
    };
    const analysis = analyzeGraphSemantics(graph, metadata);

    expect(analysis.valid).toBe(true);
    const model = buildGenerationModel(graph, analysis.enrichedMetadata);
    const source = model.operations.find((operation) => operation.id === 'Source.ReadList');
    expect(source?.navigation.associationActions).toEqual([
      {
        id: 'source-target:target',
        fieldPath: 'target',
        targetPath: '/target-read-detail',
        requiresEntityId: true,
      },
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
      node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
        associations: {
          chapters: AssociationKind.Composition,
          author: AssociationKind.Aggregation,
          'chapters.editor': AssociationKind.Aggregation,
        },
      }),
      node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
        delete: { chapters: DeletePolicy.Cascade },
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

function preparedMetadataFor(graph: ApplicationGraph) {
  return analyzeGraphSemantics(graph, basicMetadata).enrichedMetadata;
}

function node(
  id: string,
  aggregateIri: string,
  operation: ApplicationNode['operation'],
  config?: ApplicationNodeConfig,
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
    ...(config ? { config } : {}),
  };
}

function transition(id: string, source: string, target: string) {
  return {
    id,
    source,
    target,
    type: EdgeType.Transition,
  };
}
