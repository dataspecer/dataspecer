import { describe, expect, it } from 'vitest';
import { DatasourceType, Operation, type ApplicationGraph } from '@dataspecer/app-generator/graph';
import { parseGraph } from './parse-graph.ts';

function graphFixture(): ApplicationGraph {
  return {
    name: 'Katalog knih',
    dataSpecificationIri: 'urn:spec',
    datasources: [{ id: 'ds', type: DatasourceType.Rdf, endpoint: 'http://example.org/sparql' }],
    nodes: [{ id: 'books.list', aggregateIri: 'urn:agg:book', operation: Operation.ReadList }],
    edges: [],
  };
}

describe('parseGraph', () => {
  it('accepts a syntactically valid graph', () => {
    const result = parseGraph(JSON.stringify(graphFixture()));
    expect(result).toMatchObject({ graph: { name: 'Katalog knih' } });
  });

  it('rejects malformed JSON with a parse error', () => {
    const result = parseGraph('{ not json');
    expect(result).toMatchObject({ error: expect.stringContaining('Not valid JSON') });
  });

  it('rejects JSON that is not an application graph', () => {
    const result = parseGraph(JSON.stringify({ nodes: [] }));
    expect(result).toMatchObject({ error: expect.stringContaining('syntax violation') });
  });
});
