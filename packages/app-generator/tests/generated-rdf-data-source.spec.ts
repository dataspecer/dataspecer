import { afterEach, describe, expect, it, vi } from 'vitest';
import { ldkit } from 'ldkit/namespaces';
import { DataFactory } from 'ldkit/rdf';

import {
  normalizeLdkitEntity,
  requireNamedCompositionIris,
  toLdkitEntity,
} from '../assets/generated-app/src/shared/data-source/ldkit-entity-mapping.ts';
import { RdfLdkitDataSource } from '../assets/generated-app/src/shared/data-source/rdf-ldkit-data-source.ts';
import {
  buildIncomingReferencesQuery,
  buildInverseDeleteQuery,
  buildInverseInsertQuads,
  buildPageIriQuery,
  buildReferenceOptionsQuery,
  toSafeNamedNodeValue,
  toSparqlNamedNode,
} from '../assets/generated-app/src/shared/data-source/rdf-request-builders.ts';
import type {
  AggregateDescriptor,
  EntityModel,
} from '../assets/generated-app/src/shared/types/aggregate.ts';
import { normalizeMultilingualValue } from '../assets/generated-app/src/shared/forms/multilingual-value.ts';
import { AssociationKind } from '../src/graph/types.ts';
import { FieldKind } from '../src/metadata/types.ts';
import { buildLdkitSchemaBundle } from '../src/rendering/ldkit-schema.ts';
import { toRenderedAggregate } from '../src/rendering/rendered-aggregate.ts';

afterEach(() => vi.unstubAllGlobals());

const listAggregate: AggregateDescriptor<EntityModel> = {
  iri: 'https://example.org/aggregate/book',
  name: 'Book',
  classIri: 'https://example.org/class/book',
  fields: [
    {
      path: 'title',
      propertyName: 'title',
      label: 'Title',
      kind: 'primitive',
      propertyIri: 'https://example.org/property/title',
      datatype: 'http://www.w3.org/2001/XMLSchema#string',
      formControl: 'text',
      many: false,
      required: false,
    },
    {
      path: 'tags',
      propertyName: 'tags',
      label: 'Tags',
      kind: 'primitive',
      propertyIri: 'https://example.org/property/tag',
      datatype: 'http://www.w3.org/2001/XMLSchema#string',
      formControl: 'text',
      many: true,
      required: false,
    },
  ],
  createEmpty: () => ({}),
};

function captureRequestBodies(requests: string[]) {
  return vi.fn((_input: string | URL | Request, init?: RequestInit) => {
    if (typeof init?.body !== 'string') {
      throw new Error('Expected a string request body.');
    }
    requests.push(init.body);
    return Promise.resolve(new Response('', { status: 200 }));
  });
}

function sparqlResultsResponse(
  vars: string[],
  bindings: Record<string, { type: string; value: string }>[],
): Response {
  return new Response(JSON.stringify({ head: { vars }, results: { bindings } }), {
    status: 200,
    headers: { 'Content-Type': 'application/sparql-results+json' },
  });
}

function stubFetchResponse(response: Response, requests?: string[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      if (requests && typeof init?.body === 'string') {
        requests.push(init.body);
      }
      return Promise.resolve(response);
    }),
  );
}

function nTriplesResponse(triples: string[]): Response {
  return new Response(triples.join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'application/n-triples' },
  });
}

const inverseField: AggregateDescriptor<EntityModel>['fields'][number] = {
  path: 'books',
  propertyName: 'books',
  label: 'Books',
  kind: 'association',
  propertyIri: 'https://example.org/predicate/authored',
  targetClassIri: 'https://example.org/class/book',
  isReverse: true,
  many: true,
  required: false,
};

const scalarReference: AggregateDescriptor<EntityModel>['fields'][number] = {
  path: 'publisher',
  propertyName: 'publisher',
  label: 'Publisher',
  kind: 'association',
  propertyIri: 'https://example.org/publisher',
  targetClassIri: 'https://example.org/class/publisher',
  associationKind: 'aggregation',
  many: false,
  required: false,
};

const repeatedReference: AggregateDescriptor<EntityModel>['fields'][number] = {
  ...scalarReference,
  path: 'related',
  propertyName: 'related',
  label: 'Related',
  propertyIri: 'https://example.org/related',
  many: true,
};

const scalarMultilingual: AggregateDescriptor<EntityModel>['fields'][number] = {
  path: 'title',
  propertyName: 'title',
  label: 'Title',
  kind: 'primitive',
  propertyIri: 'https://example.org/title',
  formControl: 'multilingual',
  many: false,
  required: false,
};

const repeatedMultilingual: AggregateDescriptor<EntityModel>['fields'][number] = {
  ...scalarMultilingual,
  path: 'keywords',
  propertyName: 'keywords',
  label: 'Keywords',
  propertyIri: 'https://example.org/keyword',
  many: true,
};

describe('generated RDF runtime IRI boundaries', () => {
  it('rejects unsafe operation identifiers before resolving a schema or querying the endpoint', async () => {
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});
    const unsafeId = 'https://example.org/> } ; DROP ALL; #';

    await expect(dataSource.readDetail({ aggregate: listAggregate, id: unsafeId })).rejects.toThrow(
      'Entity IRI must be a safe absolute IRI.',
    );
    await expect(
      dataSource.update({ aggregate: listAggregate, id: unsafeId, payload: {} }),
    ).rejects.toThrow('Entity IRI must be a safe absolute IRI.');
    await expect(dataSource.delete({ aggregate: listAggregate, id: unsafeId })).rejects.toThrow(
      'Entity IRI must be a safe absolute IRI.',
    );
  });

  it('accepts only safe named-node values returned by a list query', () => {
    const factory = new DataFactory();

    expect(
      toSafeNamedNodeValue(factory.namedNode('https://example.org/book/1'), 'List result IRI'),
    ).toBe('https://example.org/book/1');
    expect(() => toSafeNamedNodeValue(factory.blankNode('book-1'), 'List result IRI')).toThrow(
      'List result IRI must be a safe absolute named-node IRI.',
    );
    expect(() =>
      toSafeNamedNodeValue(
        factory.namedNode('https://example.org/> } ; DROP ALL; #'),
        'List result IRI',
      ),
    ).toThrow('List result IRI must be a safe absolute IRI.');
  });
});

describe('generated RDF inverse relation queries', () => {
  it('writes and deletes inverse triples in the reversed direction', () => {
    const payload = {
      id: 'https://example.org/author/1',
      books: [{ id: 'https://example.org/book/1' }, { id: 'urn:book:2' }],
    };

    const insert = buildInverseInsertQuads([inverseField], payload);
    const remove = buildInverseDeleteQuery([inverseField], payload.id);

    expect(
      insert.map((quad) => [quad.subject.value, quad.predicate.value, quad.object.value]),
    ).toEqual([
      [
        'https://example.org/book/1',
        'https://example.org/predicate/authored',
        'https://example.org/author/1',
      ],
      ['urn:book:2', 'https://example.org/predicate/authored', 'https://example.org/author/1'],
    ]);
    expect(remove).toContain('VALUES ?predicate { <https://example.org/predicate/authored> }');
    expect(remove).toContain('?target ?predicate <https://example.org/author/1>');
  });

  it('rejects relative and query-breaking IRIs', () => {
    expect(() => toSparqlNamedNode('/relative', 'Test IRI')).toThrow('safe absolute IRI');
    expect(() => toSparqlNamedNode('https://example.org/> } ; DROP ALL; #', 'Test IRI')).toThrow(
      'safe absolute IRI',
    );
  });

  it('rejects inverse writes without an entity identifier', () => {
    expect(() => buildInverseInsertQuads([inverseField], {})).toThrow(
      'Entity IRI must be a safe absolute IRI.',
    );
  });
});

describe('generated RDF incoming reference query', () => {
  it('lists up to ten triples that point to the entity in stable order', () => {
    const query = buildIncomingReferencesQuery('https://example.org/book/1');

    expect(query).toContain('SELECT DISTINCT ?subject ?predicate');
    expect(query).toContain('?subject ?predicate <https://example.org/book/1>');
    expect(query).toContain('ORDER BY STR(?subject) STR(?predicate)');
    expect(query).toContain('LIMIT 10');
  });

  it('rejects an unsafe entity IRI', () => {
    expect(() => buildIncomingReferencesQuery('https://example.org/> } ASK {} #')).toThrow(
      'Entity IRI must be a safe absolute IRI.',
    );
  });

  it('resolves an empty result stream', async () => {
    stubFetchResponse(sparqlResultsResponse(['subject', 'predicate'], []));

    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});

    await expect(dataSource.listIncomingReferences('https://example.org/book/1')).resolves.toEqual(
      [],
    );
  });

  it('reads reference bindings from the result stream', async () => {
    stubFetchResponse(
      sparqlResultsResponse(
        ['subject', 'predicate'],
        [
          {
            subject: { type: 'uri', value: 'https://example.org/review/1' },
            predicate: { type: 'uri', value: 'https://example.org/property/book' },
          },
        ],
      ),
    );

    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});

    await expect(dataSource.listIncomingReferences('https://example.org/book/1')).resolves.toEqual([
      {
        subject: 'https://example.org/review/1',
        predicate: 'https://example.org/property/book',
      },
    ]);
  });
});

describe('generated RDF reference options', () => {
  const args = {
    classIri: 'https://example.org/class/person',
    displayProperties: ['https://example.org/property/name', 'https://example.org/property/email'],
  };

  it('queries a bounded set of IRIs and their configured display properties', () => {
    const query = buildReferenceOptionsQuery(args);

    expect(query).toContain('?iri a <https://example.org/class/person>');
    expect(query).toContain('LIMIT 200');
    expect(query).toContain('OPTIONAL { ?iri <https://example.org/property/name> ?value0 . }');
    expect(query).toContain('OPTIONAL { ?iri <https://example.org/property/email> ?value1 . }');
  });

  it('joins display values in field order and falls back to the IRI', async () => {
    stubFetchResponse(
      sparqlResultsResponse(
        ['iri', 'value0', 'value1'],
        [
          {
            iri: { type: 'uri', value: 'https://example.org/person/1' },
            value0: { type: 'literal', value: 'Alice' },
            value1: { type: 'literal', value: 'alice@example.org' },
          },
          {
            iri: { type: 'uri', value: 'https://example.org/person/1' },
            value0: { type: 'literal', value: 'Alice' },
            value1: { type: 'literal', value: 'alice@work.example' },
          },
          {
            iri: { type: 'uri', value: 'https://example.org/person/2' },
          },
        ],
      ),
    );

    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});

    await expect(dataSource.listByType(args)).resolves.toEqual([
      {
        id: 'https://example.org/person/1',
        label: 'Alice, alice@example.org, alice@work.example',
      },
      {
        id: 'https://example.org/person/2',
        label: 'https://example.org/person/2',
      },
    ]);
  });

  it('uses conventional title and label predicates when the structure has no display field', async () => {
    const query = buildReferenceOptionsQuery({
      classIri: args.classIri,
      displayProperties: [],
    });
    expect(query).toContain('<http://purl.org/dc/terms/title> ?value0');
    expect(query).toContain('<http://www.w3.org/2000/01/rdf-schema#label> ?value2');

    stubFetchResponse(
      sparqlResultsResponse(
        ['iri', 'value0', 'value1', 'value2'],
        [
          {
            iri: { type: 'uri', value: 'https://example.org/person/1' },
            value2: { type: 'literal', value: 'Alice' },
          },
        ],
      ),
    );

    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});
    await expect(
      dataSource.listByType({ classIri: args.classIri, displayProperties: [] }),
    ).resolves.toEqual([{ id: 'https://example.org/person/1', label: 'Alice' }]);
  });
});

describe('generated RDF list queries', () => {
  it('selects a stable page of entity IRIs', () => {
    const query = buildPageIriQuery(listAggregate, 20, 40);

    expect(query).toContain('SELECT DISTINCT ?iri');
    expect(query).toContain('?iri a <https://example.org/class/book>');
    expect(query).toContain('ORDER BY ASC(STR(?iri))');
    expect(query).toContain('LIMIT 20');
    expect(query).toContain('OFFSET 40');
  });

  it('orders scalar fields with missing values last and the IRI as a stable tie-breaker', () => {
    const query = buildPageIriQuery(listAggregate, 20, 0, {
      kind: 'field',
      fieldPath: 'title',
      direction: 'desc',
    });

    expect(query).toContain('MIN(?value) AS ?sortValue');
    expect(query).toContain('<https://example.org/property/title> ?value');
    expect(query).toContain('GROUP BY ?iri');
    expect(query).toContain('ORDER BY ASC(!BOUND(?sortValue)) DESC(?sortValue) ASC(STR(?iri))');
  });

  it('rejects ordering by repeating fields', () => {
    expect(() =>
      buildPageIriQuery(listAggregate, 20, 0, {
        kind: 'field',
        fieldPath: 'tags',
        direction: 'asc',
      }),
    ).toThrow('cannot be used for list sorting');
  });

  it('rejects ordering by multilingual fields even when the field is scalar', () => {
    expect(() =>
      buildPageIriQuery({ ...listAggregate, fields: [scalarMultilingual] }, 20, 0, {
        kind: 'field',
        fieldPath: 'title',
        direction: 'asc',
      }),
    ).toThrow('cannot be used for list sorting');
  });
});

describe('generated RDF mutation payloads', () => {
  it('rejects unsafe ids recursively before passing a payload to LDKit', () => {
    expect(() =>
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          chapter: {
            id: 'https://example.org/> } ; DROP ALL; #',
          },
        },
        'update',
      ),
    ).toThrow('Payload id must be a safe absolute IRI.');

    expect(() => toLdkitEntity({ id: 42 }, 'create')).toThrow(
      'Payload id must be a safe absolute IRI.',
    );
  });

  it('keeps values that tell Lens.update to clear a property', () => {
    expect(
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          title: null,
          authors: [],
          emptyReference: { id: '' },
        },
        'update',
      ),
    ).toEqual({
      $id: 'https://example.org/book/1',
      title: null,
      authors: [],
    });
  });

  it('omits empty values from Lens.insert payloads', () => {
    expect(
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          title: null,
          authors: [],
        },
        'create',
      ),
    ).toEqual({
      $id: 'https://example.org/book/1',
    });
  });

  it('converts public reference objects to scalar and repeated LDKit IRI values', () => {
    expect(
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          publisher: { id: 'https://example.org/publisher/1' },
          related: [{ id: 'https://example.org/book/2' }, { id: 'https://example.org/book/3' }],
          __specializationIri: 'https://example.org/psm/book',
          __rdfTypes: ['https://example.org/class/book'],
        },
        'update',
        [scalarReference, repeatedReference],
      ),
    ).toEqual({
      $id: 'https://example.org/book/1',
      publisher: 'https://example.org/publisher/1',
      related: ['https://example.org/book/2', 'https://example.org/book/3'],
    });
  });

  it('keeps pointer clear operations on update', () => {
    expect(
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          publisher: null,
          related: [],
        },
        'update',
        [scalarReference, repeatedReference],
      ),
    ).toEqual({
      $id: 'https://example.org/book/1',
      publisher: null,
      related: [],
    });
  });

  it('serializes multilingual maps without conflating absent and cleared properties', () => {
    expect(
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          title: { cs: ['Název'], en: ['Title'] },
          keywords: { cs: ['jedna', 'dvě'], '': ['untagged'], de: ['unconfigured'] },
        },
        'update',
        [scalarMultilingual, repeatedMultilingual],
      ),
    ).toEqual({
      $id: 'https://example.org/book/1',
      title: { cs: ['Název'], en: ['Title'] },
      keywords: { cs: ['jedna', 'dvě'], '': ['untagged'], de: ['unconfigured'] },
    });
    expect(
      toLdkitEntity({ id: 'https://example.org/book/1', title: {} }, 'update', [
        scalarMultilingual,
      ]),
    ).toEqual({ $id: 'https://example.org/book/1', title: null });
    expect(
      toLdkitEntity({ id: 'https://example.org/book/1' }, 'update', [scalarMultilingual]),
    ).toEqual({ $id: 'https://example.org/book/1' });
    expect(
      toLdkitEntity({ id: 'https://example.org/book/1', title: {} }, 'create', [
        scalarMultilingual,
      ]),
    ).toEqual({ $id: 'https://example.org/book/1' });
  });
});

describe('generated RDF read normalization', () => {
  const childName: AggregateDescriptor<EntityModel>['fields'][number] = {
    path: 'name',
    propertyName: 'name',
    label: 'Name',
    kind: 'primitive',
    propertyIri: 'https://example.org/name',
    many: false,
    required: false,
  };
  const children: AggregateDescriptor<EntityModel>['fields'][number] = {
    path: 'children',
    propertyName: 'children',
    label: 'Children',
    kind: 'association',
    propertyIri: 'https://example.org/child',
    targetClassIri: 'https://example.org/class/child',
    associationKind: 'composition',
    fields: [childName, scalarReference],
    many: true,
    required: false,
  };

  const genrePropertyIri = 'https://example.org/genre';
  const childPropertyIri = 'https://example.org/child';
  const namePropertyIri = 'https://example.org/name';
  const renderedReadAggregate = toRenderedAggregate({
    iri: listAggregate.iri,
    name: listAggregate.name,
    safeName: 'Book',
    classIri: listAggregate.classIri,
    fields: [
      {
        path: 'genres',
        label: 'Genres',
        kind: FieldKind.Association,
        propertyIri: genrePropertyIri,
        targetClassIri: 'https://example.org/class/genre',
        associationKind: AssociationKind.Aggregation,
        fields: [
          {
            path: 'name',
            label: 'Name',
            kind: FieldKind.Primitive,
            propertyIri: namePropertyIri,
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
            many: false,
            required: false,
          },
        ],
        many: true,
        required: false,
      },
      {
        path: 'children',
        label: 'Children',
        kind: FieldKind.Association,
        propertyIri: childPropertyIri,
        targetClassIri: 'https://example.org/class/child',
        targetAggregateIri: 'https://example.org/aggregate/child',
        associationKind: AssociationKind.Composition,
        fields: [
          {
            path: 'name',
            label: 'Name',
            kind: FieldKind.Primitive,
            propertyIri: namePropertyIri,
            datatype: 'http://www.w3.org/2001/XMLSchema#string',
            many: false,
            required: false,
          },
        ],
        many: true,
        required: false,
      },
    ],
  });
  const readAggregate: AggregateDescriptor<EntityModel> = {
    ...listAggregate,
    fields: renderedReadAggregate.descriptorFields,
  };
  const readSchemas = buildLdkitSchemaBundle(
    renderedReadAggregate.classIri,
    renderedReadAggregate.fields,
  );

  it('keeps existing reference labels when another target has no details', async () => {
    const bookIri = 'https://example.org/book/1';
    const fictionIri = 'https://example.org/genre/fiction';
    const deletedIri = 'https://example.org/genre/deleted';
    const requests: string[] = [];
    stubFetchResponse(
      nTriplesResponse([
        `<${bookIri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://ldkit.io/ontology/Resource> .`,
        `<${bookIri}> <${genrePropertyIri}> <${fictionIri}> .`,
        `<${bookIri}> <${genrePropertyIri}> <${deletedIri}> .`,
        `<${fictionIri}> <${namePropertyIri}> "Fiction" .`,
      ]),
      requests,
    );
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [readAggregate.iri]: readSchemas,
    });

    await expect(dataSource.readDetail({ aggregate: readAggregate, id: bookIri })).resolves.toEqual(
      {
        id: bookIri,
        genres: [
          { id: fictionIri, name: 'Fiction' },
          { id: deletedIri, name: null },
        ],
        children: [],
      },
    );
    expect(fetch).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(1);
    expect(requests[0]).not.toContain('urn:dataspecer:generated-app:referenced-node');
  });

  // The engine buffers quads and replays them. A result with none of its own must still reach the
  // consumer's end event, otherwise a missing entity never resolves and the page loads forever.
  it('resolves to null when the entity does not exist', async () => {
    stubFetchResponse(nTriplesResponse([]));
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [readAggregate.iri]: readSchemas,
    });

    await expect(
      dataSource.readDetail({ aggregate: readAggregate, id: 'https://example.org/book/missing' }),
    ).resolves.toBeNull();
  });

  it('does not turn a dangling composition into an empty child', async () => {
    const bookIri = 'https://example.org/book/1';
    const childIri = 'https://example.org/child/deleted';
    stubFetchResponse(
      nTriplesResponse([
        `<${bookIri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://ldkit.io/ontology/Resource> .`,
        `<${bookIri}> <${childPropertyIri}> <${childIri}> .`,
      ]),
    );
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [readAggregate.iri]: readSchemas,
    });

    await expect(dataSource.readDetail({ aggregate: readAggregate, id: bookIri })).rejects.toThrow(
      childIri,
    );
  });

  it('normalizes IRI pointers while keeping inline compositions expanded', () => {
    expect(
      normalizeLdkitEntity(
        {
          $id: 'https://example.org/book/1',
          publisher: 'https://example.org/publisher/1',
          related: ['https://example.org/book/2'],
          children: [
            {
              $id: 'https://example.org/child/1',
              name: 'First',
              publisher: 'https://example.org/publisher/2',
            },
          ],
        },
        [scalarReference, repeatedReference, children],
      ),
    ).toEqual({
      id: 'https://example.org/book/1',
      publisher: { id: 'https://example.org/publisher/1' },
      related: [{ id: 'https://example.org/book/2' }],
      children: [
        {
          id: 'https://example.org/child/1',
          name: 'First',
          publisher: { id: 'https://example.org/publisher/2' },
        },
      ],
    });
  });

  it('keeps an empty inline composition as an entity', () => {
    const emptyChild: AggregateDescriptor<EntityModel>['fields'][number] = {
      path: 'child',
      propertyName: 'child',
      label: 'Child',
      kind: 'association',
      propertyIri: 'https://example.org/child',
      targetClassIri: 'https://example.org/class/child',
      associationKind: 'composition',
      fields: [],
      many: false,
      required: false,
    };

    expect(
      normalizeLdkitEntity({ child: { $id: 'https://example.org/child/1' } }, [emptyChild]),
    ).toEqual({ child: { id: 'https://example.org/child/1' } });
  });

  it('normalizes scalar and repeated multilingual reads without losing languages', () => {
    expect(
      normalizeLdkitEntity(
        {
          $id: 'https://example.org/book/1',
          title: { cs: 'Název', en: ['Title'] },
          keywords: { cs: ['jedna', 'dvě'], '': ['untagged'], de: ['unconfigured'] },
        },
        [scalarMultilingual, repeatedMultilingual],
      ),
    ).toEqual({
      id: 'https://example.org/book/1',
      title: { cs: ['Název'], en: ['Title'] },
      keywords: { cs: ['jedna', 'dvě'], '': ['untagged'], de: ['unconfigured'] },
    });
  });

  it('normalizes an optional multilingual property omitted by LDKit', async () => {
    const entityIri = 'https://example.org/book/1';
    const classIri = 'https://example.org/class/book';
    stubFetchResponse(
      new Response(
        `<${entityIri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://ldkit.io/ontology/Resource> .\n` +
          `<${entityIri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <${classIri}> .`,
        { status: 200, headers: { 'content-type': 'application/n-triples' } },
      ),
    );
    const aggregate: AggregateDescriptor<EntityModel> = {
      ...listAggregate,
      classIri,
      fields: [scalarMultilingual],
    };
    const detailSchema = {
      '@type': classIri,
      title: {
        '@id': scalarMultilingual.propertyIri as string,
        '@multilang': true as const,
        '@array': true as const,
        '@optional': true as const,
      },
    };
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [aggregate.iri]: {
        detail: detailSchema,
        list: detailSchema,
        writes: { '[]': { '@type': classIri } },
        specializationWrites: {},
      },
    });

    await expect(dataSource.readDetail({ aggregate, id: entityIri })).resolves.toEqual({
      id: entityIri,
      title: {},
    });
  });

  it('does not accept a populated array as a multilingual language map', () => {
    expect(() => normalizeMultilingualValue(['invalid'])).toThrow(
      'must contain values grouped by language',
    );
  });

  it('rejects a composed blank-node identity after normalization', () => {
    expect(() =>
      requireNamedCompositionIris(
        {
          id: 'https://example.org/book/1',
          children: [{ id: 'blank1', name: 'Anonymous' }],
        },
        [children],
      ),
    ).toThrow('Blank-node compositions are not editable');
  });
});

describe('generated RDF write schema selection', () => {
  it('deletes only subject triples, leaving reverse-field triples on other entities', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', captureRequestBodies(requests));
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});

    await dataSource.delete({
      aggregate: { ...listAggregate, fields: [inverseField] },
      id: 'https://example.org/book/1',
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('?s ?p ?o');
    expect(requests[0]).toContain('VALUES ?s { <https://example.org/book/1> }');
    expect(requests[0]).not.toContain(inverseField.propertyIri);
  });

  it('updates and clears scalar and repeated IRI pointers through LDKit', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', captureRequestBodies(requests));

    const aggregate: AggregateDescriptor<EntityModel> = {
      ...listAggregate,
      fields: [scalarReference, repeatedReference],
    };
    const rootSchema = {
      '@type': aggregate.classIri,
      publisher: {
        '@id': scalarReference.propertyIri as string,
        '@type': ldkit.IRI,
        '@optional': true as const,
      },
      related: {
        '@id': repeatedReference.propertyIri as string,
        '@type': ldkit.IRI,
        '@array': true as const,
        '@optional': true as const,
      },
    };
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [aggregate.iri]: {
        detail: rootSchema,
        list: rootSchema,
        writes: { '[]': rootSchema },
        specializationWrites: {},
      },
    });

    await dataSource.update({
      aggregate,
      id: 'https://example.org/book/1',
      payload: {
        publisher: { id: 'https://example.org/publisher/1' },
        related: [{ id: 'https://example.org/book/2' }],
      } as EntityModel,
    });
    await dataSource.update({
      aggregate,
      id: 'https://example.org/book/1',
      payload: { publisher: null, related: [] } as EntityModel,
    });

    expect(requests.join('\n')).toContain('<https://example.org/publisher/1>');
    expect(requests.join('\n')).toContain('<https://example.org/book/2>');
    expect(requests).toHaveLength(2);
    expect(requests[1]).toContain(`<${scalarReference.propertyIri}>`);
    expect(requests[1]).toContain(`<${repeatedReference.propertyIri}>`);
    expect(requests[1]).not.toContain('<https://example.org/publisher/1>');
    expect(requests[1]).not.toContain('<https://example.org/book/2>');
  });

  it('writes Czech, English, repeated, and untagged multilingual literals through LDKit', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', captureRequestBodies(requests));

    const aggregate: AggregateDescriptor<EntityModel> = {
      ...listAggregate,
      fields: [scalarMultilingual, repeatedMultilingual],
    };
    const writeSchema = {
      '@type': aggregate.classIri,
      title: {
        '@id': scalarMultilingual.propertyIri as string,
        '@multilang': true as const,
        '@optional': true as const,
      },
      keywords: {
        '@id': repeatedMultilingual.propertyIri as string,
        '@multilang': true as const,
        '@optional': true as const,
      },
    };
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [aggregate.iri]: {
        detail: writeSchema,
        list: writeSchema,
        writes: { '[]': writeSchema },
        specializationWrites: {},
      },
    });

    await dataSource.create({
      aggregate,
      payload: {
        id: 'https://example.org/book/1',
        title: { cs: ['Název'], en: ['Title'] },
        keywords: { cs: ['jedna', 'dvě'], '': ['untagged'] },
      } as EntityModel,
    });
    await dataSource.update({
      aggregate,
      id: 'https://example.org/book/1',
      payload: { title: {} } as EntityModel,
    });

    const query = requests.join('\n');
    expect(query).toContain('"Název"@cs');
    expect(query).toContain('"Title"@en');
    expect(query).toContain('"jedna"@cs');
    expect(query).toContain('"dvě"@cs');
    expect(query).toContain('"untagged"');
    expect(requests).toHaveLength(2);
  });

  it('uses the selected specialization schema and stamps its concrete RDF class', async () => {
    const requests: string[] = [];
    vi.stubGlobal('fetch', captureRequestBodies(requests));

    const rendered = toRenderedAggregate({
      iri: listAggregate.iri,
      name: listAggregate.name,
      safeName: 'Book',
      classIri: listAggregate.classIri,
      fields: [
        {
          path: 'contacts',
          label: 'Contacts',
          kind: FieldKind.Association,
          propertyIri: 'https://example.org/contact',
          targetClassIri: 'https://example.org/class/contact',
          associationKind: AssociationKind.Composition,
          fields: [
            {
              path: 'name',
              label: 'Name',
              kind: FieldKind.Primitive,
              propertyIri: 'https://example.org/name',
              many: false,
              required: false,
            },
          ],
          specializations: [
            {
              specializationIri: 'https://example.org/psm/organization',
              label: 'Organization',
              classIri: 'https://example.org/class/organization',
              fieldPaths: ['name'],
            },
          ],
          many: true,
          required: false,
        },
      ],
    });
    const aggregate: AggregateDescriptor<EntityModel> = {
      ...listAggregate,
      fields: rendered.descriptorFields,
    };
    const schemas = buildLdkitSchemaBundle(rendered.classIri, rendered.fields);
    const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {
      [aggregate.iri]: schemas,
    });

    await dataSource.create({
      aggregate,
      fieldPath: ['contacts'],
      specializationIri: 'https://example.org/psm/organization',
      payload: { id: 'https://example.org/contact/1', name: 'Example' } as EntityModel,
    });

    expect(requests.join('\n')).toContain('<https://example.org/class/organization>');
    expect(requests.join('\n')).not.toContain('<https://example.org/class/contact>');
    await expect(
      dataSource.create({
        aggregate,
        fieldPath: ['contacts'],
        payload: { id: 'https://example.org/contact/2' },
      }),
    ).rejects.toThrow('requires a specialization');
  });
});
