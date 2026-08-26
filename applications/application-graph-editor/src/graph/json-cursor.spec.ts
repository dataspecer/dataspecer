import { describe, expect, it } from 'vitest';
import { graphElementAtOffset } from './json-cursor.ts';

const text = JSON.stringify(
  {
    name: 'Test graph',
    dataSpecificationIri: 'urn:spec',
    datasources: [{ id: 'ds', type: 'rdf', endpoint: 'http://example.org/sparql' }],
    nodes: [
      { id: 'books.list', aggregateIri: 'urn:agg:book', operation: 'ReadList' },
      { id: 'books.detail', aggregateIri: 'urn:agg:book', operation: 'ReadDetail' },
    ],
    edges: [
      { id: 'list-detail', source: 'books.list', target: 'books.detail', type: 'transition' },
    ],
  },
  null,
  2,
);

describe('graphElementAtOffset', () => {
  it('resolves an offset inside a node section to that node', () => {
    const offset = text.indexOf('"urn:agg:book"');
    expect(graphElementAtOffset(text, offset + 3)).toEqual({ kind: 'node', id: 'books.list' });
  });

  it('resolves an offset inside the second node to the second id', () => {
    const offset = text.indexOf('"ReadDetail"');
    expect(graphElementAtOffset(text, offset + 3)).toEqual({ kind: 'node', id: 'books.detail' });
  });

  it('resolves an offset inside an edge section to that edge', () => {
    const offset = text.indexOf('"transition"');
    expect(graphElementAtOffset(text, offset + 3)).toEqual({ kind: 'edge', id: 'list-detail' });
  });

  it('returns null outside node and edge sections', () => {
    expect(graphElementAtOffset(text, text.indexOf('"Test graph"') + 3)).toBeNull();
    expect(graphElementAtOffset(text, text.indexOf('"rdf"') + 1)).toBeNull();
  });

  it('returns null for text that is not valid JSON', () => {
    expect(graphElementAtOffset('{ not json', 3)).toBeNull();
  });

  it('returns null when the element has no string id', () => {
    const broken = JSON.stringify({ nodes: [{ operation: 'ReadList' }] });
    expect(graphElementAtOffset(broken, broken.indexOf('"ReadList"') + 3)).toBeNull();
  });
});
