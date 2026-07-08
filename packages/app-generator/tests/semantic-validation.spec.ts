import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
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
import { resolveGraphAssociationKinds } from '../src/metadata/resolve-graph-association-kinds.ts';
import { validateGraphSemantics } from '../src/validation/validate-semantics.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';

describe('validateGraphSemantics', () => {
  it('accepts a valid read list to read detail transition', () => {
    const graph = validGraph();
    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('requires exactly one RDF datasource', () => {
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
        // The JSON schema already rejects non-RDF types, so a cast is needed here to exercise
        // the defensive re-check in semantic validation.
        { id: 'main-rest', type: 'rest' as DatasourceType, endpoint: 'https://example.org/api' },
      ],
    });

    expectViolations(tooMany, ViolationCode.SemanticUnsupportedDatasourceCount);
    expectViolations(wrongType, ViolationCode.SemanticUnsupportedDatasourceType);
  });

  it('rejects unknown aggregate references', () => {
    const graph = validGraph({
      nodes: [
        node('Missing.ReadList', 'https://example.org/aggregate/missing', Operation.ReadList),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticUnknownAggregate);
  });

  it('rejects edges with unknown source or target nodes', () => {
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

    const result = validatePreparedGraph(graph);

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

  it('rejects multiple redirects from one source node', () => {
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

    expectViolations(graph, ViolationCode.SemanticMultipleRedirects);
  });

  it('validates redirect operation pairs and same-class detail redirects', () => {
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

    expectViolations(invalidPair, ViolationCode.SemanticInvalidRedirect);
    expectViolations(invalidClass, ViolationCode.SemanticRedirectRequiresSameClass);
  });

  it('validates transition operation pairs and class compatibility', () => {
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

    expectViolations(invalidPair, ViolationCode.SemanticInvalidTransition);
    expectViolations(invalidClass, ViolationCode.SemanticTransitionRequiresSameClass);
  });

  it('allows associated cross-aggregate detail transitions', () => {
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

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
  });

  it('rejects unrelated cross-aggregate detail transitions', () => {
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

    expectViolations(graph, ViolationCode.SemanticTransitionRequiresAssociation);
  });

  it('allows delete cascade through compositions only', () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        associations: { chapters: AssociationKind.Composition },
        delete: { chapters: DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
  });

  it('rejects delete cascade through aggregations', () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        associations: { author: AssociationKind.Aggregation },
        delete: { author: DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });

  it('allows nested delete cascade through configured compositions', () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        associations: {
          chapters: AssociationKind.Composition,
          'chapters.footnotes': AssociationKind.Composition,
        },
        delete: {
          chapters: DeletePolicy.Cascade,
          'chapters.footnotes': DeletePolicy.Cascade,
        },
      }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    const result = validatePreparedGraph(graph);

    expect(result.valid).toBe(true);
  });

  it('rejects nested delete cascade whose parent composition does not cascade', () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        associations: {
          chapters: AssociationKind.Composition,
          'chapters.footnotes': AssociationKind.Composition,
        },
        delete: { 'chapters.footnotes': DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCascadeRequiresParentCascade);
  });

  it('rejects circular compositions across aggregates', () => {
    const createBook = node(
      'Book.Create',
      'https://example.org/aggregate/book-detail',
      Operation.Create,
      {
        associations: { author: AssociationKind.Composition },
      }
    );
    const createAuthor = node(
      'Author.Create',
      'https://example.org/aggregate/author-detail',
      Operation.Create,
      {
        associations: { books: AssociationKind.Composition },
      }
    );
    const graph = validGraph({
      nodes: [createBook, createAuthor],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCircularComposition);
  });

  it('rejects association config on read nodes', () => {
    const graph = validGraph({
      nodes: [
        node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList, {
          associations: { author: AssociationKind.Aggregation },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticAssociationConfigNotAllowed);
  });

  it('rejects delete config on non-delete nodes', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { chapters: AssociationKind.Composition },
          delete: { chapters: DeletePolicy.Cascade },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticDeleteConfigNotAllowed);
  });

  it('rejects nested delete cascade through aggregations', () => {
    const deleteBook = node(
      'Book.Delete',
      'https://example.org/aggregate/book-detail',
      Operation.Delete,
      {
        associations: {
          chapters: AssociationKind.Composition,
          'chapters.editor': AssociationKind.Aggregation,
        },
        delete: { 'chapters.editor': DeletePolicy.Cascade },
      }
    );
    const graph = validGraph({
      nodes: [deleteBook],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticCannotCascadeAggregation);
  });

  it('rejects invalid association config values', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
          associations: { chapters: 'invalid' },
        } as unknown as ApplicationNodeConfig),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticInvalidAssociationKind);
  });

  it('rejects association config paths that are not associations', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
          associations: { title: AssociationKind.Composition },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticAssociationPathNotAssociation);
  });

  it('rejects nested association config below aggregations', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
          associations: {
            author: AssociationKind.Aggregation,
            'author.name': AssociationKind.Aggregation,
          },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticNestedAssociationRequiresComposition);
  });

  it('rejects nested association config paths that are not associations', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Delete', 'https://example.org/aggregate/book-detail', Operation.Delete, {
          associations: {
            chapters: AssociationKind.Composition,
            'chapters.name': AssociationKind.Aggregation,
          },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticAssociationPathNotAssociation);
  });

  it('rejects conflicting association config for the same aggregate path', () => {
    const graph = validGraph({
      nodes: [
        node('Book.Create', 'https://example.org/aggregate/book-detail', Operation.Create, {
          associations: { chapters: AssociationKind.Composition },
        }),
        node('Book.Update', 'https://example.org/aggregate/book-detail', Operation.Update, {
          associations: { chapters: AssociationKind.Aggregation },
        }),
      ],
      edges: [],
    });

    expectViolations(graph, ViolationCode.SemanticConflictingAssociationKind);
  });
});

function expectViolations(graph: ApplicationGraph, code: ViolationCode) {
  const result = validatePreparedGraph(graph);

  expect(result.valid).toBe(false);
  expect(result.violations).toContainEqual(expect.objectContaining({ code }));
}

function validatePreparedGraph(graph: ApplicationGraph) {
  const prepared = resolveGraphAssociationKinds(graph, basicMetadata);
  return validateGraphSemantics(graph, prepared.metadata, prepared.issues);
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
  config?: ApplicationNodeConfig
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
    ...(config ? { config } : {}),
  };
}
