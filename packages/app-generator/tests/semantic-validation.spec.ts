import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
} from '../src/graph/types.ts';
import { FakeDataspecerMetadataProvider } from '../src/metadata/fake-dataspecer-metadata-provider.ts';
import { validateGraphSemantics } from '../src/validation/validate-semantics.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';

describe('validateGraphSemantics', () => {
  it('accepts a valid read list to read detail transition', async () => {
    const result = await validateGraphSemantics(validGraph(), metadataProvider());

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('requires exactly one RDF datasource', async () => {
    const tooMany = validGraph({
      datasources: [
        {
          id: 'main-rdf',
          type: DatasourceType.Rdf,
          endpoint: 'https://example.org/sparql',
        },
        {
          id: 'other-rdf',
          type: DatasourceType.Rdf,
          endpoint: 'https://example.org/other',
        },
      ],
    });
    const wrongType = validGraph({
      datasources: [
        { id: 'main-rest', type: DatasourceType.Rest, endpoint: 'https://example.org/api' },
      ],
    });

    await expectViolations(tooMany, ViolationCode.SemanticUnsupportedDatasourceCount);
    await expectViolations(wrongType, ViolationCode.SemanticUnsupportedDatasourceType);
  });

  it('rejects unknown aggregate references', async () => {
    const graph = validGraph({
      nodes: [
        node('Missing.ReadList', 'https://example.org/aggregate/missing', Operation.ReadList),
      ],
      edges: [],
    });

    await expectViolations(graph, ViolationCode.SemanticUnknownAggregate);
  });

  it('rejects edges with unknown source or target nodes', async () => {
    const graph = validGraph({
      edges: [
        {
          id: 'missing-edge',
          source: 'Missing.ReadList',
          target: 'Missing.ReadDetail',
          type: EdgeType.Transition,
        },
      ],
    });

    const result = await validateGraphSemantics(graph, metadataProvider());

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ViolationCode.SemanticUnknownEdgeSource,
        }),
        expect.objectContaining({
          code: ViolationCode.SemanticUnknownEdgeTarget,
        }),
      ])
    );
  });

  it('rejects multiple redirects from one source node', async () => {
    const createNode = node(
      'Book.Create',
      'https://example.org/aggregate/book-form',
      Operation.Create
    );
    const graph = validGraph({
      nodes: [...validGraph().nodes, createNode],
      edges: [
        {
          id: 'create-to-list',
          source: createNode.id,
          target: 'Book.ReadList',
          type: EdgeType.Redirect,
        },
        {
          id: 'create-to-detail',
          source: createNode.id,
          target: 'Book.ReadDetail',
          type: EdgeType.Redirect,
        },
      ],
    });

    await expectViolations(graph, ViolationCode.SemanticMultipleRedirects);
  });

  it('validates redirect operation pairs and same-class detail redirects', async () => {
    const createBook = node(
      'Book.Create',
      'https://example.org/aggregate/book-form',
      Operation.Create
    );
    const authorDetail = node(
      'Author.ReadDetail',
      'https://example.org/aggregate/author-detail',
      Operation.ReadDetail
    );
    const invalidPair = validGraph({
      edges: [
        {
          id: 'list-redirect',
          source: 'Book.ReadList',
          target: 'Book.ReadDetail',
          type: EdgeType.Redirect,
        },
      ],
    });
    const invalidClass = validGraph({
      nodes: [...validGraph().nodes, createBook, authorDetail],
      edges: [
        {
          id: 'create-author-detail',
          source: createBook.id,
          target: authorDetail.id,
          type: EdgeType.Redirect,
        },
      ],
    });

    await expectViolations(invalidPair, ViolationCode.SemanticInvalidRedirect);
    await expectViolations(invalidClass, ViolationCode.SemanticRedirectRequiresSameClass);
  });

  it('validates transition operation pairs and class compatibility', async () => {
    const authorDetail = node(
      'Author.ReadDetail',
      'https://example.org/aggregate/author-detail',
      Operation.ReadDetail
    );
    const updateAuthor = node(
      'Author.Update',
      'https://example.org/aggregate/author-detail',
      Operation.Update
    );
    const invalidPair = validGraph({
      edges: [
        {
          id: 'create-transition',
          source: 'Book.ReadList',
          target: 'Book.ReadList',
          type: EdgeType.Transition,
        },
      ],
    });
    const invalidClass = validGraph({
      nodes: [...validGraph().nodes, authorDetail, updateAuthor],
      edges: [
        {
          id: 'book-detail-author-update',
          source: 'Book.ReadDetail',
          target: updateAuthor.id,
          type: EdgeType.Transition,
        },
      ],
    });

    await expectViolations(invalidPair, ViolationCode.SemanticInvalidTransition);
    await expectViolations(invalidClass, ViolationCode.SemanticTransitionRequiresSameClass);
  });

  it('allows associated cross-aggregate detail transitions', async () => {
    const authorDetail = node(
      'Author.ReadDetail',
      'https://example.org/aggregate/author-detail',
      Operation.ReadDetail
    );
    const graph = validGraph({
      nodes: [...validGraph().nodes, authorDetail],
      edges: [
        {
          id: 'book-detail-author-detail',
          source: 'Book.ReadDetail',
          target: authorDetail.id,
          type: EdgeType.Transition,
        },
      ],
    });

    const result = await validateGraphSemantics(graph, metadataProvider());

    expect(result.valid).toBe(true);
  });

  it('rejects unrelated cross-aggregate detail transitions', async () => {
    const chapterDetail = node(
      'Chapter.ReadDetail',
      'https://example.org/aggregate/chapter-detail',
      Operation.ReadDetail
    );
    const graph = validGraph({
      nodes: [validGraph().nodes[0], chapterDetail],
      edges: [
        {
          id: 'book-list-chapter-detail',
          source: 'Book.ReadList',
          target: chapterDetail.id,
          type: EdgeType.Transition,
        },
      ],
    });

    await expectViolations(graph, ViolationCode.SemanticTransitionRequiresAssociation);
  });

  it('allows delete cascade through compositions only', async () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      { delete: { chapters: 'cascade' } }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    const result = await validateGraphSemantics(graph, metadataProvider());

    expect(result.valid).toBe(true);
  });

  it('rejects delete cascade through aggregations', async () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      { delete: { author: 'cascade' } }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    await expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });
});

async function expectViolations(graph: ApplicationGraph, code: ViolationCode) {
  const result = await validateGraphSemantics(graph, metadataProvider());

  expect(result.valid).toBe(false);
  expect(result.violations).toContainEqual(expect.objectContaining({ code }));
}

function metadataProvider() {
  return new FakeDataspecerMetadataProvider({
    [specificationIri]: basicMetadata,
  });
}

function validGraph(overrides: Partial<ApplicationGraph> = {}): ApplicationGraph {
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
      node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
    ],
    edges: [
      {
        id: 'book-list-book-detail',
        source: 'Book.ReadList',
        target: 'Book.ReadDetail',
        type: EdgeType.Transition,
      },
    ],
    ...overrides,
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
