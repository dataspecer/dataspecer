import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
} from '../src/graph/types.ts';
import { validateGraphStructure } from '../src/validation/validate-structure.ts';

describe('validateGraphStructure', () => {
  it('accepts a valid graph without metadata', () => {
    const result = validateGraphStructure(validGraph());

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('rejects invalid transition operation pairs without metadata', () => {
    const graph = validGraph({
      edges: [
        {
          id: 'list-list',
          source: 'Book.ReadList',
          target: 'Book.ReadList',
          type: EdgeType.Transition,
        },
      ],
    });

    const result = validateGraphStructure(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticInvalidTransition })
    );
  });

  it('rejects node ids that produce the same route id', () => {
    const graph = validGraph({
      nodes: [
        node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList),
        node('book-read-list', 'https://example.org/aggregate/book-list', Operation.ReadList),
      ],
      edges: [],
    });

    const result = validateGraphStructure(graph);

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticDuplicateRouteId,
        path: '/nodes/1/id',
      })
    );
  });
});

function validGraph(overrides: Partial<ApplicationGraph> = {}): ApplicationGraph {
  return {
    name: 'Library application',
    dataSpecificationIri: 'https://example.org/specification/library',
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
  operation: ApplicationNode['operation']
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
  };
}
