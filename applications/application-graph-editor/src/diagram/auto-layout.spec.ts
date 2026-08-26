import { describe, expect, it } from 'vitest';
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
} from '@dataspecer/app-generator/graph';
import { autoLayout } from './auto-layout.ts';

function graph(edges: ApplicationGraph['edges']): ApplicationGraph {
  return {
    name: 'Test',
    dataSpecificationIri: 'urn:spec',
    datasources: [{ id: 'ds', type: DatasourceType.Rdf, endpoint: 'http://example.org/sparql' }],
    nodes: [
      { id: 'books.list', aggregateIri: 'urn:agg:book', operation: Operation.ReadList },
      { id: 'books.detail', aggregateIri: 'urn:agg:book', operation: Operation.ReadDetail },
    ],
    edges,
  };
}

function edge(source: string, target: string): ApplicationGraph['edges'][number] {
  return { id: `${source}-${target}`, source, target, type: EdgeType.Transition };
}

describe('autoLayout', () => {
  it('places every node', async () => {
    const positions = await autoLayout(graph([edge('books.list', 'books.detail')]));
    expect(Object.keys(positions).sort()).toEqual(['books.detail', 'books.list']);
  });

  it('lays out a graph with an edge that ends nowhere', async () => {
    const positions = await autoLayout(graph([edge('books.list', 'gone')]));
    expect(Object.keys(positions).sort()).toEqual(['books.detail', 'books.list']);
  });

  it('lays out a graph whose edge starts nowhere', async () => {
    const positions = await autoLayout(graph([edge('gone', 'books.detail')]));
    expect(Object.keys(positions)).toHaveLength(2);
  });

  it('lays out an edge from a node to itself', async () => {
    const positions = await autoLayout(graph([edge('books.list', 'books.list')]));
    expect(Object.keys(positions)).toHaveLength(2);
  });

  it('lays out with the layered algorithm as well', async () => {
    const positions = await autoLayout(graph([edge('books.list', 'gone')]), {
      algorithm: 'layered',
      direction: 'RIGHT',
    });
    expect(Object.keys(positions)).toHaveLength(2);
  });
});
