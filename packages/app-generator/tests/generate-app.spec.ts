import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { ViolationCode } from '../src/validation/violation-codes.ts';
import { ViolationSeverity } from '../src/validation/types.ts';
import { generateApp } from '../src/generate-app.ts';
import {
  AssociationKind,
  type ApplicationGraph,
  type ApplicationNode,
  DatasourceType,
  EdgeType,
  Operation,
} from '../src/graph/types.ts';
import { FieldKind } from '../src/metadata/types.ts';
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

// Generating an application renders the templates and formats them with prettier, which takes
// seconds on a CI runner that also runs the other packages' tests at the same time.
describe('generateApp', { timeout: 30_000 }, () => {
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

  it('rejects an empty application before loading metadata', async () => {
    const result = await generateApp({
      graph: graphFixture({ nodes: [], edges: [] }),
      metadataProvider: {
        getSpecificationMetadata: () => Promise.reject(new Error('must not be called')),
      },
    });

    expect(result.success).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticNoNodes })
    );
    expect(result.violations).not.toContainEqual(
      expect.objectContaining({ code: ViolationCode.MetadataResolutionFailed })
    );
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
                message:
                  'Data structure "example" does not have a root class that can be resolved.',
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
        sourceCode: DataspecerMetadataMappingIssueCode.MissingRootClass,
        message: 'Data structure "example" does not have a root class that can be resolved.',
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
        nodes: [
          node('Book.List', 'https://example.org/aggregate/book-list', Operation.ReadList),
          node('book list', 'https://example.org/aggregate/book-list', Operation.ReadList),
        ],
        edges: [],
      }),
      metadataProvider: {
        getSpecificationMetadata: () => Promise.reject(new Error('must not be called')),
      },
    });

    expect(result.success).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticDuplicateRouteId })
    );
    expect(result.violations).not.toContainEqual(
      expect.objectContaining({ code: ViolationCode.MetadataResolutionFailed })
    );
  });

  it('generates an application whose only problems are warnings', async () => {
    const result = await generateApp({
      graph: graphFixture({
        edges: [
          {
            id: 'book-list-book-detail',
            source: 'Book.ReadList',
            target: 'Book.ReadDetail',
            type: EdgeType.Transition,
          },
          {
            id: 'book-list-book-detail-again',
            source: 'Book.ReadList',
            target: 'Book.ReadDetail',
            type: EdgeType.Transition,
          },
        ],
      }),
      metadataProvider: metadataProvider(),
    });

    expect(result.success).toBe(true);
    expect(Object.keys(result.files)).toContain('src/routes.tsx');
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticDuplicateEdge,
        severity: ViolationSeverity.Warning,
      })
    );
  });
  it('generates files in memory without an output directory', async () => {
    const result = await generateApp({
      graph: graphFixture(),
      metadataProvider: metadataProvider(),
    });

    expect(result.success).toBe(true);
    expect(result.writtenFiles).toEqual([]);
    expect(Object.keys(result.files)).toContain('src/routes.tsx');
    // navigation is emitted into the page it belongs to, as source rather than quoted JSON
    expect(result.files['src/modules/book-list/book-read-list-page.tsx']).toContain(
      'targetPath: "/book-read-detail"'
    );
    expect(result.files['src/modules/book-list/book-read-list-page.tsx']).not.toContain(
      '"targetPath":'
    );
    expect(result.files['src/modules/book-detail/descriptor.ts']).toContain('path: "chapters"');
    expect(result.files['src/modules/book-detail/descriptor.ts']).not.toContain('"path":');
    expect(result.generationModel?.operations).toHaveLength(2);
  });

  it('generates valid source for names that start with a number', async () => {
    const aggregateIri = 'https://example.org/aggregate/123-books';
    const result = await generateApp({
      graph: graphFixture({
        nodes: [node('123 Books.ReadList', aggregateIri, Operation.ReadList)],
        edges: [],
      }),
      metadataProvider: new FakeDataspecerMetadataProvider({
        [specificationIri]: {
          dataSpecificationIri: specificationIri,
          aggregates: [
            {
              iri: aggregateIri,
              name: '123 Books',
              classIri: 'https://example.org/class/book',
              fields: [],
            },
          ],
        },
      }),
    });

    expect(result.success).toBe(true);
    expect(result.files['src/modules/123-books/model.ts']).toContain(
      'export interface _123BooksModel'
    );
    expect(result.files['src/modules/123-books/123-books-read-list-page.tsx']).toContain(
      'export function _123BooksReadListPage()'
    );
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

  it('typechecks a generated application outside the repository source tree', async () => {
    const outputDirectory = await createTempDirectory();
    const aggregateIri = 'https://example.org/aggregate/link';
    const homepage = {
      path: 'homepage',
      label: 'Homepage',
      kind: FieldKind.Association,
      propertyIri: 'https://example.org/p/homepage',
      targetClassIri: 'https://example.org/class/page',
      many: false,
    };
    const email = {
      path: 'email',
      label: 'Email',
      kind: FieldKind.Association,
      propertyIri: 'https://example.org/p/email',
      targetClassIri: 'https://example.org/class/mailbox',
      many: true,
    };
    const result = await generateApp({
      graph: graphFixture({
        nodes: [
          {
            id: 'Link.Create',
            aggregateIri,
            operation: Operation.Create,
            config: {
              associations: {
                target: AssociationKind.Aggregation,
                related: AssociationKind.Aggregation,
                contacts: AssociationKind.Composition,
                'contacts.homepage': AssociationKind.Aggregation,
                'contacts.email': AssociationKind.Aggregation,
              },
            },
          },
          {
            id: 'Link.Update',
            aggregateIri,
            operation: Operation.Update,
            config: {
              associations: {
                target: AssociationKind.Aggregation,
                related: AssociationKind.Aggregation,
                contacts: AssociationKind.Composition,
                'contacts.homepage': AssociationKind.Aggregation,
                'contacts.email': AssociationKind.Aggregation,
              },
            },
          },
          node('Link.ReadDetail', aggregateIri, Operation.ReadDetail),
        ],
        edges: [],
      }),
      metadataProvider: new FakeDataspecerMetadataProvider({
        [specificationIri]: {
          dataSpecificationIri: specificationIri,
          aggregates: [
            {
              iri: aggregateIri,
              name: 'Link',
              classIri: 'https://example.org/class/link',
              fields: [
                {
                  path: 'title',
                  label: 'Title',
                  kind: FieldKind.Primitive,
                  propertyIri: 'https://example.org/p/title',
                  datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
                  many: false,
                },
                {
                  path: 'keywords',
                  label: 'Keywords',
                  kind: FieldKind.Primitive,
                  propertyIri: 'https://example.org/p/keyword',
                  datatype: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',
                  many: true,
                },
                {
                  path: 'encoded',
                  label: 'Encoded',
                  kind: FieldKind.Primitive,
                  propertyIri: 'https://example.org/p/encoded',
                  datatype: 'http://www.w3.org/2001/XMLSchema#base64Binary',
                  many: false,
                },
                {
                  path: 'target',
                  label: 'Target',
                  kind: FieldKind.Association,
                  propertyIri: 'https://example.org/p/target',
                  targetClassIri: 'https://example.org/class/target',
                  many: false,
                },
                {
                  path: 'related',
                  label: 'Related',
                  kind: FieldKind.Association,
                  propertyIri: 'https://example.org/p/related',
                  targetClassIri: 'https://example.org/class/target',
                  many: true,
                },
                {
                  path: 'contacts',
                  label: 'Contacts',
                  kind: FieldKind.Association,
                  propertyIri: 'https://example.org/p/contact',
                  targetClassIri: 'https://example.org/class/contact',
                  many: true,
                  fields: [homepage, email],
                  specializations: [
                    {
                      specializationIri: 'https://example.org/psm/organization',
                      label: 'Organization',
                      classIri: 'https://example.org/class/organization',
                      fieldPaths: ['homepage'],
                      identityPolicy: 'ALWAYS',
                    },
                    {
                      specializationIri: 'https://example.org/psm/person',
                      label: 'Person',
                      classIri: 'https://example.org/class/person',
                      fieldPaths: ['email'],
                      identityPolicy: 'ALWAYS',
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
      outputDirectory,
    });
    expect(result.success).toBe(true);
    const schema = await readFile(
      join(outputDirectory, 'src/modules/link/ldkit-schema.ts'),
      'utf8'
    );
    expect(schema).toContain('import { ldkit, xsd } from "ldkit/namespaces";');
    expect(schema).toContain('xsd.base64Binary');
    expect(schema).toContain('specializationWrites:');

    await linkGeneratedDependencies(outputDirectory);
    const repositoryNodeModules = resolve(process.cwd(), 'node_modules');
    await new Promise<void>((resolvePromise, reject) => {
      execFile(
        process.execPath,
        [
          join(repositoryNodeModules, 'typescript/bin/tsc'),
          '--noEmit',
          '-p',
          join(outputDirectory, 'tsconfig.json'),
        ],
        { cwd: outputDirectory },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`${error.message}\n${stdout}${stderr}`));
          } else {
            resolvePromise();
          }
        }
      );
    });
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
  });
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

async function linkGeneratedDependencies(outputDirectory: string): Promise<void> {
  const packageJson = JSON.parse(await readFile(join(outputDirectory, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const dependencies = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  });

  for (const dependency of dependencies) {
    const localDependency = resolve(process.cwd(), 'node_modules', dependency);
    const rootDependency = resolve(process.cwd(), '../../node_modules', dependency);
    const source = (await pathExists(localDependency)) ? localDependency : rootDependency;
    const target = join(outputDirectory, 'node_modules', dependency);
    await mkdir(dirname(target), { recursive: true });
    await symlink(source, target, 'dir');
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
