import { describe, expect, it } from 'vitest';

import { FieldKind } from '../src/metadata/types.ts';
import type { GeneratedAggregateDescriptor } from '../src/generation-model/types.ts';
import { buildLdkitSchema } from '../src/rendering/ldkit-schema.ts';
import { toRenderedAggregate } from '../src/rendering/rendered-aggregate.ts';

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
const CLASS = 'https://example.org/class/sample';

type Fields = GeneratedAggregateDescriptor['fields'];

function renderedAggregate(fields: Fields) {
  return toRenderedAggregate({
    iri: 'https://example.org/aggregate/sample',
    name: 'Sample',
    safeName: 'Sample',
    classIri: CLASS,
    fields,
  });
}

function schemaFor(fields: Fields) {
  const aggregate = renderedAggregate(fields);
  return buildLdkitSchema(aggregate.classIri, aggregate.fields) as Record<string, any>;
}

describe('LDKit schema generation', () => {
  it('uses the class IRI as the entity type', () => {
    const schema = schemaFor([]);
    expect(schema['@type']).toBe(CLASS);
  });

  it('maps primitive datatypes to xsd types and marks read properties optional', () => {
    const schema = schemaFor([
      {
        path: 'title',
        label: 'Title',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/title',
        datatype: `${XSD}string`,
        many: false,
        required: true,
      },
      {
        path: 'count',
        label: 'Count',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/count',
        datatype: `${XSD}integer`,
        many: false,
        required: false,
      },
    ]);

    expect(schema.title).toEqual({
      '@id': 'https://example.org/p/title',
      '@type': `${XSD}string`,
      '@optional': true,
    });
    expect(schema.count).toEqual({
      '@id': 'https://example.org/p/count',
      '@type': `${XSD}integer`,
      '@optional': true,
    });
  });

  it('marks repeated fields as arrays', () => {
    const schema = schemaFor([
      {
        path: 'tags',
        label: 'Tags',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/tags',
        datatype: `${XSD}string`,
        many: true,
        required: true,
      },
    ]);
    expect(schema.tags['@array']).toBe(true);
  });

  it('reads language tagged values through multilang and omits the type', () => {
    const schema = schemaFor([
      {
        path: 'note',
        label: 'Note',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/note',
        datatype: RDF_LANG_STRING,
        many: false,
        required: true,
      },
    ]);
    expect(schema.note).toEqual({
      '@id': 'https://example.org/p/note',
      '@multilang': true,
      '@optional': true,
    });
  });

  it('leaves unrecognized datatypes as plain strings without a type', () => {
    const schema = schemaFor([
      {
        path: 'raw',
        label: 'Raw',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/raw',
        datatype: 'http://www.w3.org/2000/01/rdf-schema#Literal',
        many: false,
        required: true,
      },
    ]);
    expect(schema.raw).toEqual({ '@id': 'https://example.org/p/raw', '@optional': true });
  });

  it('expands associations with inline fields under a nested schema', () => {
    const schema = schemaFor([
      {
        path: 'chapters',
        label: 'Chapters',
        kind: FieldKind.Association,
        propertyIri: 'https://example.org/p/chapters',
        targetClassIri: 'https://example.org/class/chapter',
        many: true,
        required: false,
        fields: [
          {
            path: 'name',
            label: 'Name',
            kind: FieldKind.Primitive,
            propertyIri: 'https://example.org/p/name',
            datatype: `${XSD}string`,
            many: false,
            required: true,
          },
        ],
      },
    ]);

    expect(schema.chapters['@array']).toBe(true);
    expect(schema.chapters['@optional']).toBe(true);
    expect(schema.chapters['@schema']).toEqual({
      '@type': 'https://example.org/class/chapter',
      name: {
        '@id': 'https://example.org/p/name',
        '@type': `${XSD}string`,
        '@optional': true,
      },
    });
  });

  it('keeps associations without inline fields as references', () => {
    const schema = schemaFor([
      {
        path: 'author',
        label: 'Author',
        kind: FieldKind.Association,
        propertyIri: 'https://example.org/p/author',
        targetAggregateIri: 'https://example.org/aggregate/author',
        targetClassIri: 'https://example.org/class/author',
        many: false,
        required: true,
      },
    ]);
    // A reference carries no @type, so LDKit resolves it to the target IRI string.
    expect(schema.author).toEqual({ '@id': 'https://example.org/p/author', '@optional': true });
  });

  it('treats inline fields without a target class as a reference in both schema and model', () => {
    const fields = [
      {
        path: 'orphan',
        label: 'Orphan',
        kind: FieldKind.Association,
        propertyIri: 'https://example.org/p/orphan',
        many: false,
        required: true,
        // Inline fields but no target class, so there is no @type for a nested schema.
        fields: [
          {
            path: 'inner',
            label: 'Inner',
            kind: FieldKind.Primitive,
            propertyIri: 'https://example.org/p/inner',
            datatype: `${XSD}string`,
            many: false,
            required: true,
          },
        ],
      },
    ];
    const aggregate = renderedAggregate(fields);
    const schema = buildLdkitSchema(aggregate.classIri, aggregate.fields) as Record<string, any>;
    const orphan = aggregate.fields.find((field) => field.path === 'orphan');

    expect(schema.orphan).toEqual({ '@id': 'https://example.org/p/orphan', '@optional': true });
    expect(orphan?.modelType).toBe('string');
    expect(orphan?.emptyValue).toBe('""');
  });

  it('uses an empty language map for repeated multilang fields', () => {
    const aggregate = renderedAggregate([
      {
        path: 'labels',
        label: 'Labels',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/labels',
        datatype: RDF_LANG_STRING,
        many: true,
        required: true,
      },
    ]);
    const labels = aggregate.fields.find((field) => field.path === 'labels');

    expect(labels?.modelType).toBe('Record<string, string[]>');
    expect(labels?.emptyValue).toBe('{}');
  });

  it('marks reverse relations as inverse', () => {
    const schema = schemaFor([
      {
        path: 'authored_by',
        label: 'Authored by',
        kind: FieldKind.Association,
        propertyIri: 'https://example.org/p/authored-by',
        targetClassIri: 'https://example.org/class/book',
        isReverse: true,
        many: true,
        required: false,
      },
    ]);
    expect(schema.authored_by['@inverse']).toBe(true);
  });

  it('omits fields that have no property IRI', () => {
    const schema = schemaFor([
      {
        path: 'ghost',
        label: 'Ghost',
        kind: FieldKind.Primitive,
        datatype: `${XSD}string`,
        many: false,
        required: true,
      },
    ]);
    expect(schema.ghost).toBeUndefined();
  });

  it('aligns model types with the datatypes LDKit returns', () => {
    const aggregate = renderedAggregate([
      {
        path: 'created',
        label: 'Created',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/created',
        datatype: `${XSD}dateTime`,
        many: false,
        required: true,
      },
      {
        path: 'note',
        label: 'Note',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/note',
        datatype: RDF_LANG_STRING,
        many: false,
        required: true,
      },
    ]);
    const fields = aggregate.fields;
    const created = fields.find((field) => field.path === 'created');
    const note = fields.find((field) => field.path === 'note');

    expect(created?.modelType).toBe('Date');
    expect(created?.emptyValue).toBe('new Date()');
    expect(note?.modelType).toBe('Record<string, string>');
  });
});
