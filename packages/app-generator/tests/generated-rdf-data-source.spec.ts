import { describe, expect, it } from 'vitest';

import {
  buildInverseDeleteQuery,
  buildInverseInsertQuery,
  toSparqlNamedNode,
} from '../assets/generated-app/static/src/shared/datasource/rdf-ldkit-data-source.ts';
import type {
  AggregateDescriptor,
  EntityModel,
} from '../assets/generated-app/static/src/shared/types/aggregate.ts';

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

    const insert = buildInverseInsertQuery([inverseField], payload);
    const remove = buildInverseDeleteQuery([inverseField], payload.id);

    expect(insert).toContain(
      '<https://example.org/book/1> <https://example.org/predicate/authored> <https://example.org/author/1> .'
    );
    expect(insert).toContain(
      '<urn:book:2> <https://example.org/predicate/authored> <https://example.org/author/1> .'
    );
    expect(remove).toContain('VALUES ?predicate { <https://example.org/predicate/authored> }');
    expect(remove).toContain('?target ?predicate <https://example.org/author/1>');
  });

  it('rejects relative and query-breaking IRIs', () => {
    expect(() => toSparqlNamedNode('/relative', 'Test IRI')).toThrow('safe absolute IRI');
    expect(() => toSparqlNamedNode('https://example.org/> } ; DROP ALL; #', 'Test IRI')).toThrow(
      'safe absolute IRI'
    );
  });
});
