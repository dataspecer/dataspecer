import { describe, expect, it } from 'vitest';

import { buildGenerationModel } from '../src/generation-model/build-generation-model.ts';
import {
  DatasourceType,
  EdgeType,
  Operation,
  type ApplicationGraph,
  type ApplicationNode,
  type ApplicationNodeConfig,
} from '../src/graph/types.ts';
import { FieldKind } from '../src/metadata/types.ts';
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

  it('renders nested association fields in models and descriptors', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);
    const tree = renderGeneratedApp(model);

    const modelSource = tree.get('src/modules/book-detail/model.ts');
    expect(modelSource).toContain('export interface BookDetailChaptersModel extends EntityModel');
    expect(modelSource).toContain(
      'export interface BookDetailChaptersFootnotesModel extends EntityModel'
    );
    expect(modelSource).toContain('chapters?: BookDetailChaptersModel[] | null;');
    expect(modelSource).toContain('footnotes?: BookDetailChaptersFootnotesModel[] | null;');
    const descriptor = tree.get('src/modules/book-detail/descriptor.ts');
    expect(descriptor).toContain('"path": "chapters"');
    expect(descriptor).toContain('"path": "footnotes"');
    expect(descriptor).toContain('"propertyName": "footnotes"');
    expect(tree.get('src/shared/components/field-value.ts')).toContain('formatFieldValue');
  });

  it('renders diacritic labels as ASCII module and property names', () => {
    const graph = graphFixture();
    graph.nodes = [node('Cíl.ReadList', 'https://example.org/aggregate/cil', Operation.ReadList)];
    graph.edges = [];
    const model = buildGenerationModel(graph, {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'https://example.org/aggregate/cil',
          name: 'Turistický cíl',
          classIri: 'https://example.org/class/cil',
          fields: [
            {
              path: 'má_url',
              label: 'Má URL',
              kind: FieldKind.Primitive,
              datatype: 'string',
            },
          ],
        },
      ],
    });
    const tree = renderGeneratedApp(model);

    expect(tree.get('src/modules/turisticky-cil/model.ts')).toContain('ma_url?: string | null');
    expect(tree.get('src/modules/turisticky-cil/descriptor.ts')).toContain(
      '"propertyName": "ma_url"'
    );
    expect(tree.get('src/modules/turisticky-cil/descriptor.ts')).toContain('"label": "Má URL"');
  });

  it('renders routes, pages, and the RDF/LDKit read adapter', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);
    const tree = renderGeneratedApp(model);

    expect(tree.get('src/routes.tsx')).toContain('BookReadListPage');
    expect(tree.get('src/routes.tsx')).toContain('path: "/book-read-detail"');
    expect(tree.get('src/routes.tsx')).toContain('requiresEntityId: true');
    expect(tree.get('src/pages/BookReadListPage.tsx')).toContain('invokeOperation');
    expect(tree.get('src/pages/BookReadListPage.tsx')).not.toContain('"fieldPath": "author"');
    expect(tree.get('src/modules/book-list/model.ts')).toContain('export interface BookListModel');
    expect(tree.get('src/modules/book-list/book-read-list-operation.ts')).toContain(
      'extends DefaultReadListStrategy<BookListModel>'
    );
    expect(tree.get('src/shared/datasource/rdf-ldkit-data-source.ts')).toContain('createLens');
    const readme = tree.get('README.md');
    expect(readme).toContain('Generated/User-Owned Boundaries');
    expect(readme).toMatch(/generated from Dataspecer aggregate\s+field metadata/);
  });

  it('renders graph transitions as page, row, and association navigation actions', () => {
    const graph = graphFixture();
    graph.nodes = [
      node('Book.ReadList', 'https://example.org/aggregate/book-list', Operation.ReadList, {
        pageTitle: 'Books',
      }),
      node('Book.ReadDetail', 'https://example.org/aggregate/book-detail', Operation.ReadDetail),
      node('Book.Create', 'https://example.org/aggregate/book-form', Operation.Create),
      node('Book.Update', 'https://example.org/aggregate/book-form', Operation.Update),
      node('Book.Delete', 'https://example.org/aggregate/book-form', Operation.Delete),
      node(
        'Author.ReadDetail',
        'https://example.org/aggregate/author-detail',
        Operation.ReadDetail
      ),
    ];
    graph.edges = [
      transition('list-create', 'Book.ReadList', 'Book.Create'),
      transition('list-detail', 'Book.ReadList', 'Book.ReadDetail'),
      transition('list-update', 'Book.ReadList', 'Book.Update'),
      transition('list-delete', 'Book.ReadList', 'Book.Delete'),
      transition('list-author-detail', 'Book.ReadList', 'Author.ReadDetail'),
      transition('detail-list', 'Book.ReadDetail', 'Book.ReadList'),
      transition('detail-update', 'Book.ReadDetail', 'Book.Update'),
      transition('detail-delete', 'Book.ReadDetail', 'Book.Delete'),
      transition('detail-author-detail', 'Book.ReadDetail', 'Author.ReadDetail'),
    ];

    const tree = renderGeneratedApp(buildGenerationModel(graph, basicMetadata));
    const listPage = tree.get('src/pages/BookReadListPage.tsx');
    const detailPage = tree.get('src/pages/BookReadDetailPage.tsx');
    const registry = tree.get('src/generated/operation-registry.ts');

    expect(listPage).toContain('pageActions={operation.navigation.pageActions}');
    expect(listPage).toContain('rowActions={operation.navigation.rowActions}');
    expect(registry).toContain('export const operations = {');
    expect(registry).toContain('} satisfies Record<string, RegisteredOperation>;');
    expect(registry).toContain('navigation: {');
    expect(registry).toContain('"targetPath": "/book-create"');
    expect(registry).toContain('"targetPath": "/book-update"');
    expect(registry).toContain('"targetPath": "/book-delete"');
    expect(registry).toContain('"fieldPath": "author"');

    expect(detailPage).toContain('readRouteEntityId(window.location.search)');
    expect(detailPage).toContain('setError("Missing required entity id.")');
    expect(detailPage).toContain('pageActions={operation.navigation.pageActions}');
    expect(registry).toContain('"targetPath": "/book-read-list"');

    expect(tree.get('src/shared/components/list-view.tsx')).toContain('rowActions');
    expect(tree.get('src/shared/components/detail-view.tsx')).toContain('associationActions');
    expect(tree.get('src/App.tsx')).not.toContain('example-id');
    expect(tree.get('src/shared/operations/read-detail-strategy.ts')).toContain(
      "stringParam(ctx.params, 'id')"
    );
  });

  it('generates an LDKit schema with nested schemas for embedded associations', () => {
    const graph = graphFixture();
    graph.nodes = [
      node('Place.ReadDetail', 'https://example.org/aggregate/place', Operation.ReadDetail),
    ];
    graph.edges = [];
    const model = buildGenerationModel(graph, {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'https://example.org/aggregate/place',
          name: 'Place',
          classIri: 'https://example.org/class/place',
          fields: [
            {
              path: 'name',
              label: 'Name',
              kind: FieldKind.Primitive,
              propertyIri: 'https://example.org/p/name',
              datatype: 'http://www.w3.org/2001/XMLSchema#string',
            },
            {
              path: 'contacts',
              label: 'Contacts',
              kind: FieldKind.Association,
              propertyIri: 'https://example.org/p/contact',
              targetClassIri: 'https://example.org/class/contact',
              many: true,
              fields: [
                {
                  path: 'email',
                  label: 'Email',
                  kind: FieldKind.Primitive,
                  propertyIri: 'https://example.org/p/email',
                  datatype: 'http://www.w3.org/2001/XMLSchema#string',
                },
              ],
            },
          ],
        },
      ],
    });
    const schema = renderGeneratedApp(model).get('src/modules/place/ldkit-schema.ts');

    expect(schema).toContain('export const PlaceLdkitSchema: Schema');
    expect(schema).toContain('"@type": "https://example.org/class/place"');
    // Datatypes are emitted as xsd namespace references so the schema matches LDKit's Schema type.
    expect(schema).toContain('import { xsd } from "ldkit/namespaces";');
    expect(schema).toContain('"@type": xsd.string');
    // contacts is an embedded association, so it expands under a nested schema keyed by its class.
    expect(schema).toContain('"@schema"');
    expect(schema).toContain('"@type": "https://example.org/class/contact"');
    expect(schema).toContain('"@array": true');
  });

  it('emits a form control for each editable primitive datatype', () => {
    const graph = graphFixture();
    graph.nodes = [node('Widget.Create', 'https://example.org/aggregate/widget', Operation.Create)];
    graph.edges = [];
    const model = buildGenerationModel(graph, {
      dataSpecificationIri: specificationIri,
      aggregates: [
        {
          iri: 'https://example.org/aggregate/widget',
          name: 'Widget',
          classIri: 'https://example.org/class/widget',
          fields: [
            primitive('label', 'http://www.w3.org/2001/XMLSchema#string'),
            primitive('active', 'http://www.w3.org/2001/XMLSchema#boolean'),
            primitive('count', 'http://www.w3.org/2001/XMLSchema#integer'),
            primitive('releasedOn', 'http://www.w3.org/2001/XMLSchema#date'),
            primitive('createdAt', 'http://www.w3.org/2001/XMLSchema#dateTime'),
          ],
        },
      ],
    });
    const descriptor = renderGeneratedApp(model).get('src/modules/widget/descriptor.ts');

    expect(descriptor).toContain('"formControl": "text"');
    expect(descriptor).toContain('"formControl": "checkbox"');
    expect(descriptor).toContain('"formControl": "number"');
    expect(descriptor).toContain('"formControl": "date"');
    expect(descriptor).toContain('"formControl": "datetime"');
  });

  it('redirects a create form back to its class list on success', () => {
    const model = buildGenerationModel(graphFixture(), basicMetadata);
    const createOperation = model.operations.find(
      (operation) => operation.operation === Operation.Create
    );
    const listOperation = model.operations.find(
      (operation) => operation.operation === Operation.ReadList
    );

    // Create uses the book-form aggregate and the list uses book-list, so the redirect can only
    // be found by their shared class rather than by aggregate IRI.
    expect(createOperation?.navigation.successRedirect?.targetPath).toBe(
      `/${listOperation?.routeId}`
    );
    expect(createOperation?.navigation.successRedirect?.label).toBe('Back to list');
    // Read operations are not forms, so they have no success redirect.
    expect(listOperation?.navigation.successRedirect).toBeUndefined();
  });
});

function primitive(path: string, datatype: string) {
  return {
    path,
    label: path,
    kind: FieldKind.Primitive,
    propertyIri: `https://example.org/p/${path}`,
    datatype,
  };
}

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
  config?: ApplicationNodeConfig
): ApplicationNode {
  return {
    id,
    aggregateIri,
    operation,
    ...(config ? { config } : {}),
  };
}

function transition(id: string, source: string, target: string) {
  return {
    id,
    source,
    target,
    type: EdgeType.Transition,
  };
}
