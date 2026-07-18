import { describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import { validateApplicationGraph } from '../src/validate-application-graph.ts';
import { type ApplicationGraph, DatasourceType, EdgeType, Operation } from '../src/graph/types.ts';
import { FakeDataspecerMetadataProvider } from '../src/metadata/fake-dataspecer-metadata-provider.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';

describe('validateApplicationGraph', () => {
  it('accepts a valid graph and returns the parsed graph with enriched metadata', async () => {
    const result = await validateApplicationGraph({
      graph: graphFixture(),
      metadataProvider: metadataProvider(),
    });

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.graph?.name).toBe('Library application');
    expect(result.enrichedMetadata?.aggregates.length).toBeGreaterThan(0);
  });

  it('rejects invalid syntax without a parsed graph', async () => {
    const result = await validateApplicationGraph({
      graph: { nodes: [] },
      metadataProvider: metadataProvider(),
    });

    expect(result.valid).toBe(false);
    expect(result.graph).toBeUndefined();
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.GraphSyntaxInvalid })
    );
  });

  it('rejects structural violations before metadata is needed', async () => {
    const graph = graphFixture({ datasources: [] });

    const result = await validateApplicationGraph({
      graph,
      metadataProvider: failingMetadataProvider(),
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticUnsupportedDatasourceCount })
    );
  });

  it('reports metadata loader failures as violations', async () => {
    const result = await validateApplicationGraph({
      graph: graphFixture(),
      metadataProvider: failingMetadataProvider(),
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.MetadataResolutionFailed })
    );
  });

  it('rejects semantic violations such as unknown aggregates', async () => {
    const graph = graphFixture();
    graph.nodes[0].aggregateIri = 'https://example.org/aggregate/unknown';

    const result = await validateApplicationGraph({
      graph,
      metadataProvider: metadataProvider(),
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticUnknownAggregate })
    );
  });
});

function metadataProvider() {
  return new FakeDataspecerMetadataProvider({
    [specificationIri]: basicMetadata,
  });
}

function failingMetadataProvider() {
  return {
    getSpecificationMetadata: () => Promise.reject(new Error('unreachable')),
  };
}

function graphFixture(overrides: Partial<ApplicationGraph> = {}): ApplicationGraph {
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
      {
        id: 'Book.ReadList',
        aggregateIri: 'https://example.org/aggregate/book-list',
        operation: Operation.ReadList,
      },
      {
        id: 'Book.ReadDetail',
        aggregateIri: 'https://example.org/aggregate/book-detail',
        operation: Operation.ReadDetail,
      },
    ],
    edges: [
      {
        id: 'list-detail',
        source: 'Book.ReadList',
        target: 'Book.ReadDetail',
        type: EdgeType.Transition,
      },
    ],
    ...overrides,
  };
}
