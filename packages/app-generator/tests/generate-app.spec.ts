import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import { generateApp } from '../src/generate-app.ts';
import {
  type ApplicationGraph,
  type ApplicationNode,
  DatasourceType,
  EdgeType,
  Operation,
} from '../src/graph/types.ts';
import {
  DataspecerMetadataMappingError,
  DataspecerMetadataMappingIssueCode,
} from '../src/metadata/dataspecer-specification-metadata-provider.ts';
import { FakeDataspecerMetadataProvider } from '../src/metadata/fake-dataspecer-metadata-provider.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('generateApp', () => {
  it('returns violations and writes nothing for invalid graph syntax', async () => {
    const outputDirectory = await createTempDirectory();

    const result = await generateApp({
      graph: { nodes: [] },
      metadataProvider: metadataProvider(),
      outputDirectory,
    });

    expect(result.success).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.GraphSyntaxInvalid })
    );
    expect(result.files).toEqual({});
    expect(result.writtenFiles).toEqual([]);
  });

  it('returns violations and writes nothing for invalid graph semantics', async () => {
    const result = await generateApp({
      graph: graphFixture({
        datasources: [
          { id: 'main-rdf', type: DatasourceType.Rdf, endpoint: 'https://example.org/sparql' },
          { id: 'other-rdf', type: DatasourceType.Rdf, endpoint: 'https://example.org/other' },
        ],
      }),
      metadataProvider: metadataProvider(),
    });

    expect(result.success).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticUnsupportedDatasourceCount,
      })
    );
    expect(result.files).toEqual({});
  });

  it('returns violations when metadata mapping fails', async () => {
    const result = await generateApp({
      graph: graphFixture(),
      metadataProvider: {
        getSpecificationMetadata: () =>
          Promise.reject(
            new DataspecerMetadataMappingError([
              {
                code: DataspecerMetadataMappingIssueCode.MissingRootClass,
                message: 'Structure model "example" does not have a resolvable root class.',
                path: 'structureModels[0]',
              },
            ])
          ),
      },
    });

    expect(result.success).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        code: ViolationCode.MetadataResolutionFailed,
        message: 'Structure model "example" does not have a resolvable root class.',
        path: 'structureModels[0]',
      }),
    ]);
    expect(result.files).toEqual({});
  });

  it('returns a violation when metadata loading fails unexpectedly', async () => {
    const result = await generateApp({
      graph: graphFixture(),
      metadataProvider: {
        getSpecificationMetadata: () => Promise.reject(new Error('backend unreachable')),
      },
    });

    expect(result.success).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        code: ViolationCode.MetadataResolutionFailed,
        message: expect.stringContaining('backend unreachable'),
      }),
    ]);
  });

  it('reports structure violations without loading metadata', async () => {
    const result = await generateApp({
      graph: graphFixture({
        edges: [
          {
            id: 'list-detail-redirect',
            source: 'Book.ReadList',
            target: 'Book.ReadDetail',
            type: EdgeType.Redirect,
          },
        ],
      }),
      metadataProvider: {
        getSpecificationMetadata: () => Promise.reject(new Error('must not be called')),
      },
    });

    expect(result.success).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticInvalidRedirect })
    );
    expect(result.violations).not.toContainEqual(
      expect.objectContaining({ code: ViolationCode.MetadataResolutionFailed })
    );
  });
  // todo enable later
  /*
  it('generates files in memory without an output directory', async () => {
    const result = await generateApp({
      graph: graphFixture(),
      metadataProvider: metadataProvider(),
    });

    expect(result.success).toBe(true);
    expect(result.writtenFiles).toEqual([]);
    expect(Object.keys(result.files)).toContain('src/routes.tsx');
    expect(result.files['src/generated/operation-registry.ts']).toContain(
      'targetPath: "/book-read-detail"'
    );
    expect(result.files['src/generated/operation-registry.ts']).not.toContain('"targetPath":');
    expect(result.files['src/modules/book-detail/descriptor.ts']).toContain('path: "chapters"');
    expect(result.files['src/modules/book-detail/descriptor.ts']).not.toContain('"path":');
    expect(result.generationModel?.operations).toHaveLength(2);
  });

  it('writes generated files to an empty output directory', async () => {
    const outputDirectory = await createTempDirectory();

    const result = await generateApp({
      graph: graphFixture(),
      metadataProvider: metadataProvider(),
      outputDirectory,
    });

    expect(result.success).toBe(true);
    expect(result.writtenFiles).toContain('package.json');
    await expect(readFile(join(outputDirectory, 'src/routes.tsx'), 'utf8')).resolves.toContain(
      'BookReadListPage'
    );
  });

  it('prevents accidental overwrite unless explicitly allowed', async () => {
    const outputDirectory = await createTempDirectory();
    await writeFile(join(outputDirectory, 'existing.txt'), 'keep me', 'utf8');

    const rejected = await generateApp({
      graph: graphFixture(),
      metadataProvider: metadataProvider(),
      outputDirectory,
    });
    const allowed = await generateApp({
      graph: graphFixture(),
      metadataProvider: metadataProvider(),
      outputDirectory,
      allowOverwrite: true,
    });

    expect(rejected.success).toBe(false);
    expect(rejected.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.GenerateWriteFailed })
    );
    expect(allowed.success).toBe(true);
    await expect(readFile(join(outputDirectory, 'existing.txt'), 'utf8')).resolves.toBe('keep me');
  });*/
});

function metadataProvider() {
  return new FakeDataspecerMetadataProvider({
    [specificationIri]: basicMetadata,
  });
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
      node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
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

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'app-generator-'));
  tempDirectories.push(directory);
  return directory;
}
