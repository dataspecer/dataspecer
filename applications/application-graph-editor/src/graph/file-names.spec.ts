import { describe, expect, it } from 'vitest';
import { DatasourceType, Operation, type ApplicationGraph } from '@dataspecer/app-generator/graph';
import { archiveFileName, exportFileName } from './file-names.ts';

function graphFixture(): ApplicationGraph {
  return {
    name: 'Katalog knih ÁÉÍÓÚÝČŘŠŽĎŇŤĚŮáéíóúýčřšžďňťěů',
    dataSpecificationIri: 'urn:spec',
    datasources: [{ id: 'ds', type: DatasourceType.Rdf, endpoint: 'http://example.org/sparql' }],
    nodes: [{ id: 'books.list', aggregateIri: 'urn:agg:book', operation: Operation.ReadList }],
    edges: [],
  };
}

describe('exportFileName', () => {
  it('derives the file name from the graph name', () => {
    expect(exportFileName(graphFixture())).toBe(
      'katalog-knih-aeiouycrszdnte-uaeiouycrszdnteu.json',
    );
  });

  it('falls back when the name has no usable characters', () => {
    expect(exportFileName({ ...graphFixture(), name: '—' })).toBe('generated-application.json');
  });
});

describe('archiveFileName', () => {
  it('matches the name the backend derives for the generated archive', () => {
    expect(archiveFileName(graphFixture())).toBe(
      'katalog-knih-aeiouycrszdnte-uaeiouycrszdnteu.zip',
    );
  });

  it('uses the backend fallback when the name has no usable characters', () => {
    expect(archiveFileName({ ...graphFixture(), name: '—' })).toBe('generated-application.zip');
  });
});
