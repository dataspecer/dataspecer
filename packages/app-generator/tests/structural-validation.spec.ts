import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import { ViolationSeverity } from '../src/validation/types.ts';
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
      expect.objectContaining({
        code: ViolationCode.SemanticInvalidTransition,
        severity: ViolationSeverity.Error,
      }),
    );
  });

  it('explains why ReadDetail cannot transition to Create', () => {
    expect(invalidEdgeMessage(Operation.ReadDetail, Operation.Create, EdgeType.Transition)).toBe(
      'Transition "invalid-edge" cannot connect ReadDetail to Create. ' +
        'Create can only be a transition target from ReadList.',
    );
  });

  it('explains why Delete cannot redirect to ReadDetail', () => {
    expect(invalidEdgeMessage(Operation.Delete, Operation.ReadDetail, EdgeType.Redirect)).toBe(
      'Redirect "invalid-edge" cannot connect Delete to ReadDetail. ' +
        'A redirect from Delete must target ReadList.',
    );
  });

  it.each([
    [EdgeType.Transition, Operation.ReadList, Operation.ReadList, 'must target Create'],
    [EdgeType.Transition, Operation.Create, Operation.ReadList, 'redirect from Create to ReadList'],
    [
      EdgeType.Transition,
      Operation.Update,
      Operation.ReadDetail,
      'redirect from Update to ReadList',
    ],
    [EdgeType.Transition, Operation.Delete, Operation.ReadList, 'redirect from Delete to ReadList'],
    [EdgeType.Redirect, Operation.ReadList, Operation.ReadDetail, 'navigation from ReadList'],
    [EdgeType.Redirect, Operation.ReadDetail, Operation.ReadList, 'navigation from ReadDetail'],
    [EdgeType.Redirect, Operation.Create, Operation.Create, 'redirect from Create must target'],
    [EdgeType.Redirect, Operation.Update, Operation.Delete, 'redirect from Update must target'],
  ])('gives actionable guidance for an invalid %s from %s', (type, source, target, guidance) => {
    expect(invalidEdgeMessage(source, target, type)).toContain(guidance);
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
      }),
    );
  });

  it('rejects a graph without operation nodes', () => {
    const result = validateGraphStructure(validGraph({ nodes: [], edges: [] }));

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticNoNodes,
        path: '/nodes',
      }),
    );
  });

  it('warns about an edge duplicating another one of the same type', () => {
    const base = validGraph();
    const result = validateGraphStructure(
      validGraph({
        edges: [
          ...base.edges,
          {
            id: 'duplicate',
            source: 'Book.ReadList',
            target: 'Book.ReadDetail',
            type: EdgeType.Transition,
          },
        ],
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticDuplicateEdge,
        path: '/edges/1',
        severity: ViolationSeverity.Warning,
      }),
    );
  });

  it('keeps different node pairs apart when ids contain the key separator', () => {
    const result = validateGraphStructure(
      validGraph({
        nodes: [
          node('a b', 'https://example.org/aggregate/book-list', Operation.ReadList),
          node('c', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
          node('a', 'https://example.org/aggregate/book-list', Operation.ReadList),
          node('b c', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
        ],
        edges: [
          { id: 'first', source: 'a b', target: 'c', type: EdgeType.Transition },
          { id: 'second', source: 'a', target: 'b c', type: EdgeType.Transition },
        ],
      }),
    );

    expect(result.violations).not.toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticDuplicateEdge }),
    );
  });

  it('allows a transition and a redirect between the same nodes', () => {
    const base = validGraph();
    const result = validateGraphStructure(
      validGraph({
        edges: [
          ...base.edges,
          {
            id: 'same-pair-redirect',
            source: 'Book.ReadList',
            target: 'Book.ReadDetail',
            type: EdgeType.Redirect,
          },
        ],
      }),
    );

    expect(result.violations).not.toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticDuplicateEdge }),
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

function graphWithEdge(source: Operation, target: Operation, type: EdgeType): ApplicationGraph {
  return validGraph({
    nodes: [
      node('source', 'https://example.org/aggregate/source', source),
      node('target', 'https://example.org/aggregate/target', target),
    ],
    edges: [{ id: 'invalid-edge', source: 'source', target: 'target', type }],
  });
}

function invalidEdgeMessage(source: Operation, target: Operation, type: EdgeType): string {
  const result = validateGraphStructure(graphWithEdge(source, target, type));
  const code =
    type === EdgeType.Transition
      ? ViolationCode.SemanticInvalidTransition
      : ViolationCode.SemanticInvalidRedirect;
  const violation = result.violations.find((candidate) => candidate.code === code);
  expect(violation).toBeDefined();
  return violation?.message ?? '';
}

function node(
  id: string,
  aggregateIri: string,
  operation: ApplicationNode['operation'],
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
  };
}
