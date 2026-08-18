import { describe, expect, it, vi } from 'vitest';

import {
  buildIncomingReferencesQuery,
  buildInverseDeleteQuery,
  buildInverseInsertQuads,
  buildPageIriQuery,
  buildReferenceOptionsQuery,
  RdfLdkitDataSource,
  toLdkitEntity,
  toSparqlNamedNode,
} from '../assets/generated-app/src/shared/data-source/rdf-ldkit-data-source.ts';
import type {
  AggregateDescriptor,
  EntityModel,
} from '../assets/generated-app/src/shared/types/aggregate.ts';

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

describe('generated RDF inverse relation queries', () => {
  it('writes and deletes inverse triples in the reversed direction', () => {
    const payload = {
      id: 'https://example.org/author/1',
      books: [{ id: 'https://example.org/book/1' }, { id: 'urn:book:2' }],
    };

    const insert = buildInverseInsertQuads([inverseField], payload);
    const remove = buildInverseDeleteQuery([inverseField], payload.id);

    expect(
      insert.map((quad) => [quad.subject.value, quad.predicate.value, quad.object.value])
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
      'safe absolute IRI'
    );
  });

  it('rejects inverse writes without an entity identifier', () => {
    expect(() => buildInverseInsertQuads([inverseField], {})).toThrow(
      'Entity IRI must be a safe absolute IRI.'
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
      'Entity IRI must be a safe absolute IRI.'
    );
  });

  it('resolves an empty result stream', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          head: { vars: ['subject', 'predicate'] },
          results: { bindings: [] },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/sparql-results+json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});

      await expect(
        dataSource.listIncomingReferences('https://example.org/book/1')
      ).resolves.toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reads reference bindings from the result stream', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          head: { vars: ['subject', 'predicate'] },
          results: {
            bindings: [
              {
                subject: { type: 'uri', value: 'https://example.org/review/1' },
                predicate: { type: 'uri', value: 'https://example.org/property/book' },
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/sparql-results+json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});

      await expect(
        dataSource.listIncomingReferences('https://example.org/book/1')
      ).resolves.toEqual([
        {
          subject: 'https://example.org/review/1',
          predicate: 'https://example.org/property/book',
        },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
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
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          head: { vars: ['iri', 'value0', 'value1'] },
          results: {
            bindings: [
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
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/sparql-results+json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
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
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses conventional title and label predicates when the structure has no display field', async () => {
    const query = buildReferenceOptionsQuery({
      classIri: args.classIri,
      displayProperties: [],
    });
    expect(query).toContain('<http://purl.org/dc/terms/title> ?value0');
    expect(query).toContain('<http://www.w3.org/2000/01/rdf-schema#label> ?value2');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            head: { vars: ['iri', 'value0', 'value1', 'value2'] },
            results: {
              bindings: [
                {
                  iri: { type: 'uri', value: 'https://example.org/person/1' },
                  value2: { type: 'literal', value: 'Alice' },
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/sparql-results+json' },
          }
        )
      )
    );

    try {
      const dataSource = new RdfLdkitDataSource('https://example.org/sparql', {});
      await expect(
        dataSource.listByType({ classIri: args.classIri, displayProperties: [] })
      ).resolves.toEqual([{ id: 'https://example.org/person/1', label: 'Alice' }]);
    } finally {
      vi.unstubAllGlobals();
    }
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
      })
    ).toThrow('cannot be used for list sorting');
  });
});

describe('generated RDF mutation payloads', () => {
  it('keeps values that tell Lens.update to clear a property', () => {
    expect(
      toLdkitEntity(
        {
          id: 'https://example.org/book/1',
          title: null,
          authors: [],
          emptyReference: { id: '' },
        },
        'update'
      )
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
        'create'
      )
    ).toEqual({
      $id: 'https://example.org/book/1',
    });
  });
});
