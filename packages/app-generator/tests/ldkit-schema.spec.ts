import { describe, expect, it } from 'vitest';
import { OFN } from '@dataspecer/core/well-known';
import { ldkit } from 'ldkit/namespaces';

import { AssociationKind } from '../src/graph/types.ts';
import { FieldKind } from '../src/metadata/types.ts';
import {
  RDF_TYPES_PROPERTY,
  type GeneratedAggregateDescriptor,
} from '../src/generation-model/types.ts';
import { datatypeMapping } from '../src/rendering/datatypes.ts';
import { buildLdkitSchemaBundle, toLdkitSchemaSource } from '../src/rendering/ldkit-schema.ts';
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
  return buildLdkitSchemaBundle(aggregate.classIri, aggregate.fields).detail as Record<string, any>;
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

  it('uses array reads and scalar writes for multilingual values', () => {
    const aggregate = renderedAggregate([
      {
        path: 'note',
        label: 'Note',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/note',
        datatype: RDF_LANG_STRING,
        many: false,
        required: true,
      },
      {
        path: 'keywords',
        label: 'Keywords',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/keyword',
        datatype: RDF_LANG_STRING,
        many: true,
        required: false,
      },
    ]);
    const bundle = buildLdkitSchemaBundle(aggregate.classIri, aggregate.fields) as Record<
      string,
      any
    >;
    const note = aggregate.fields.find((field) => field.path === 'note');
    const keywords = aggregate.fields.find((field) => field.path === 'keywords');

    expect(bundle.detail.note).toEqual({
      '@id': 'https://example.org/p/note',
      '@array': true,
      '@multilang': true,
      '@optional': true,
    });
    expect(bundle.detail.keywords).toMatchObject({ '@array': true, '@multilang': true });
    expect(bundle.writes['[]'].note).toEqual({
      '@id': 'https://example.org/p/note',
      '@multilang': true,
      '@optional': true,
    });
    expect(bundle.writes['[]'].keywords).toEqual({
      '@id': 'https://example.org/p/keyword',
      '@multilang': true,
      '@optional': true,
    });
    expect(note?.modelType).toBe('MultilingualValue');
    expect(keywords?.modelType).toBe('MultilingualValue');
    expect(note?.formControl).toBe('multilingual');
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
        associationKind: AssociationKind.Composition,
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
      name: {
        '@id': 'https://example.org/p/name',
        '@type': `${XSD}string`,
        '@optional': true,
      },
    });
  });

  it('represents a reference as an IRI pointer without type-stamping its target', () => {
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
    expect(schema.author).toEqual({
      '@id': 'https://example.org/p/author',
      '@type': ldkit.IRI,
      '@optional': true,
    });
  });

  it('marks a reverse reference @inverse so LDKit reads it backwards', () => {
    const schema = schemaFor([
      {
        path: 'graph',
        label: 'Graph',
        kind: FieldKind.Association,
        propertyIri: 'https://example.org/p/nodes',
        targetClassIri: 'https://example.org/class/graph',
        isReverse: true,
        many: false,
        required: false,
      },
    ]);
    expect(schema.graph).toEqual({
      '@id': 'https://example.org/p/nodes',
      '@inverse': true,
      '@type': ldkit.IRI,
      '@optional': true,
    });
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
    const schema = buildLdkitSchemaBundle(aggregate.classIri, aggregate.fields).detail as Record<
      string,
      any
    >;
    const orphan = aggregate.fields.find((field) => field.path === 'orphan');

    expect(schema.orphan).toEqual({
      '@id': 'https://example.org/p/orphan',
      '@type': ldkit.IRI,
      '@optional': true,
    });
    expect(orphan?.modelType).toBe('{ id: string }');
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

  it('separates list, detail, and specialization write shapes', () => {
    const aggregate = renderedAggregate([
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
        path: 'contacts',
        label: 'Contacts',
        kind: FieldKind.Association,
        associationKind: AssociationKind.Composition,
        propertyIri: 'https://example.org/p/contact',
        targetClassIri: 'https://example.org/class/contact',
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
          {
            path: 'email',
            label: 'Email',
            kind: FieldKind.Primitive,
            propertyIri: 'https://example.org/p/email',
            datatype: `${XSD}string`,
            many: false,
            required: false,
          },
        ],
        specializations: [
          {
            specializationIri: 'https://example.org/psm/organization',
            label: 'Organization',
            classIri: 'https://example.org/class/organization',
            fieldPaths: ['name', 'email'],
          },
          {
            specializationIri: 'https://example.org/psm/person',
            label: 'Person',
            classIri: 'https://example.org/class/person',
            fieldPaths: ['name'],
          },
        ],
      },
    ]);

    const bundle = buildLdkitSchemaBundle(aggregate.classIri, aggregate.fields) as Record<
      string,
      any
    >;
    const detailContact = bundle.detail.contacts['@schema'];

    expect(detailContact['@type']).toBeUndefined();
    expect(detailContact[RDF_TYPES_PROPERTY]).toEqual({
      '@id': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      '@type': ldkit.IRI,
      '@array': true,
      '@optional': true,
    });
    expect(bundle.list.contacts).toBeUndefined();
    expect(bundle.writes['[]'].contacts['@type']).toBe(ldkit.IRI);
    expect(bundle.writes['["contacts"]']).toBeUndefined();
    expect(
      bundle.specializationWrites['["contacts"]']['https://example.org/psm/organization']
    ).toMatchObject({
      '@type': 'https://example.org/class/organization',
      name: { '@id': 'https://example.org/p/name' },
      email: { '@id': 'https://example.org/p/email' },
    });
    expect(
      bundle.specializationWrites['["contacts"]']['https://example.org/psm/person'].email
    ).toBeUndefined();
  });

  it('emits LDKit and XSD namespace datatype expressions', () => {
    const aggregate = renderedAggregate([
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
        path: 'author',
        label: 'Author',
        kind: FieldKind.Association,
        associationKind: AssociationKind.Aggregation,
        propertyIri: 'https://example.org/p/author',
        targetClassIri: 'https://example.org/class/author',
        many: false,
        required: false,
      },
    ]);
    const source = toLdkitSchemaSource(
      buildLdkitSchemaBundle(aggregate.classIri, aggregate.fields)
    );

    expect(source).toContain('"@type": xsd.string');
    expect(source).toContain('"@type": ldkit.IRI');
    expect(source).not.toContain('"https://ldkit.io/ontology/IRI"');
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
    expect(note?.modelType).toBe('MultilingualValue');
  });

  it('uses separate controls for integer and fractional numbers', () => {
    expect(datatypeMapping(`${XSD}integer`).formControl).toBe('integer');
    expect(datatypeMapping(`${XSD}unsignedLong`).formControl).toBe('integer');
    expect(datatypeMapping(`${XSD}decimal`).formControl).toBe('number');
    expect(datatypeMapping(`${XSD}float`).formControl).toBe('number');
    expect(datatypeMapping(`${XSD}double`).formControl).toBe('number');
  });

  it('maps OFN Text and rdf:langString to the multilingual control', () => {
    expect(datatypeMapping(OFN.text)).toMatchObject({
      tsType: 'MultilingualValue',
      formControl: 'multilingual',
      multilingual: true,
    });
    expect(datatypeMapping(OFN.rdfLangString)).toMatchObject({
      tsType: 'MultilingualValue',
      formControl: 'multilingual',
      multilingual: true,
    });
  });

  it('emits namespace expressions for xsd datatypes containing digits', () => {
    const aggregate = renderedAggregate([
      {
        path: 'encoded',
        label: 'Encoded',
        kind: FieldKind.Primitive,
        propertyIri: 'https://example.org/p/encoded',
        datatype: `${XSD}base64Binary`,
        many: false,
        required: false,
      },
    ]);

    expect(
      toLdkitSchemaSource(buildLdkitSchemaBundle(aggregate.classIri, aggregate.fields))
    ).toContain('"@type": xsd.base64Binary');
  });
});
