import { describe, expect, it } from 'vitest';

import { buildGenerationModel } from '../src/generation-model/build-generation-model.ts';
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
} from '../src/graph/types.ts';
import { renderGeneratedApp } from '../src/rendering/render-generated-app.ts';
import { basicMetadata, specificationIri } from './fixtures/metadata/basic-metadata.ts';

describe('renderGeneratedApp', () => {
  it('renders a deterministic React/Vite file tree', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);
    const first = renderGeneratedApp(model).toObject();
    const second = renderGeneratedApp(model).toObject();

    expect(first).toEqual(second);
    expect(Object.keys(first)).toEqual(
      expect.arrayContaining([
        'README.md',
        'index.html',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'src/App.tsx',
        'src/data-source/create-data-source.ts',
        'src/generated/operation-registry.ts',
        'src/main.tsx',
        'src/modules/book-list/model.ts',
        'src/modules/book-list/descriptor.ts',
        'src/modules/book-list/book-read-list-operation.ts',
        'src/modules/book-detail/book-read-detail-operation.ts',
        'src/pages/BookCreatePage.tsx',
        'src/pages/BookReadDetailPage.tsx',
        'src/pages/BookReadListPage.tsx',
        'src/routes.tsx',
        'src/shared/datasource/data-source.ts',
        'src/shared/operations/operation-strategy.ts',
        'src/shared/components/list-view.tsx',
      ])
    );
  });

  it('renders routes, pages, and the RDF/LDKit read adapter', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);
    const tree = renderGeneratedApp(model);

    expect(tree.get('src/routes.tsx')).toContain('BookReadListPage');
    expect(tree.get('src/routes.tsx')).toContain('/book-read-detail/:id');
    expect(tree.get('src/pages/BookReadListPage.tsx')).toContain('invokeOperation');
    expect(tree.get('src/modules/book-list/model.ts')).toContain('export interface BookListModel');
    expect(tree.get('src/modules/book-list/book-read-list-operation.ts')).toContain(
      'extends DefaultReadListStrategy<BookListModel>'
    );
    expect(tree.get('src/shared/datasource/rdf-ldkit-data-source.ts')).toContain('createLens');
    expect(tree.get('README.md')).toContain('Generated/User-Owned Boundaries');
  });
});

function graphFixture(): ApplicationGraph {
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
      node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList, {
        pageTitle: 'Books',
      }),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
      node('Book.Create', 'https://example.org/aggregate/book-form', Operation.Create),
    ],
    edges: [
      {
        id: 'list-detail',
        source: 'Book.ReadList',
        target: 'Book.ReadDetail',
        type: EdgeType.Transition,
      },
      {
        id: 'create-list',
        source: 'Book.Create',
        target: 'Book.ReadList',
        type: EdgeType.Redirect,
      },
    ],
  };
}

function node(
  id: string,
  aggregateIri: string,
  operation: ApplicationNode['operation'],
  config?: Record<string, unknown>
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
    ...(config ? { config } : {}),
  };
}
