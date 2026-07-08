import { readFileSync } from 'node:fs';

import { DataPsmAssociationEnd } from '@dataspecer/core/data-psm/model/data-psm-association-end';
import { DataPsmAttribute } from '@dataspecer/core/data-psm/model/data-psm-attribute';
import { DataPsmClass } from '@dataspecer/core/data-psm/model/data-psm-class';
import { DataPsmClassReference } from '@dataspecer/core/data-psm/model/data-psm-class-reference';
import { DataPsmSchema } from '@dataspecer/core/data-psm/model/data-psm-schema';
import type {
  SemanticModelClass,
  SemanticModelRelationship,
} from '@dataspecer/core-v2/semantic-model/concepts';
import { describe, expect, it } from 'vitest';

import {
  DataspecerMetadataMappingError,
  DataspecerMetadataMappingIssueCode,
  DataspecerSpecificationMetadataProvider,
  mapDataspecerSpecificationToMetadata,
} from '../src/metadata/dataspecer-specification-metadata-provider.ts';
import type { SpecificationSource } from '../src/metadata/specification-source.ts';
import { FieldKind } from '../src/metadata/types.ts';

const specificationIri = 'https://example.org/specification/library';

describe('mapDataspecerSpecificationToMetadata', () => {
  it('maps Dataspecer semantic and structure resources to aggregate metadata', () => {
    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, dataspecerFixture());

    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(metadata.dataSpecificationIri).toBe(specificationIri);
    expect(book).toEqual({
      iri: 'https://example.org/aggregate/book-detail',
      name: 'Book detail',
      classIri: 'https://example.org/class/book',
      fields: [
        {
          path: 'title',
          label: 'Title',
          kind: FieldKind.Primitive,
          propertyIri: 'https://example.org/property/relationship-title',
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
          many: false,
          required: true,
        },
        {
          path: 'chapters',
          label: 'Chapters',
          kind: FieldKind.Association,
          propertyIri: 'https://example.org/property/relationship-chapters',
          targetAggregateIri: 'https://example.org/aggregate/chapter-detail',
          targetClassIri: 'https://example.org/class/chapter',
          many: true,
          required: false,
        },
        {
          path: 'author',
          label: 'Author',
          kind: FieldKind.Association,
          propertyIri: 'https://example.org/property/relationship-author',
          targetAggregateIri: 'https://example.org/aggregate/author-detail',
          targetClassIri: 'https://example.org/class/author',
          many: false,
          required: false,
        },
      ],
    });
  });

  it('maps inline association target classes to nested fields', () => {
    const fixture = dataspecerFixture();
    fixture.aggregatedSemanticModel.push(
      semanticClass('class-publisher', 'https://example.org/class/publisher', 'Publisher'),
      semanticRelationship(
        'relationship-publisher',
        'Publisher',
        'class-book',
        'class-publisher',
        [0, 1]
      ),
      semanticRelationship(
        'relationship-publisher-name',
        'Publisher name',
        'class-publisher',
        'http://www.w3.org/2001/XMLSchema#string',
        [1, 1]
      )
    );
    const bookClass = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/book'
    ) as DataPsmClass;
    bookClass.dataPsmParts = [...bookClass.dataPsmParts, 'https://example.org/psm/book-publisher'];
    fixture.structureModels[0].push(
      association(
        'https://example.org/psm/book-publisher',
        'publisher',
        'relationship-publisher',
        'https://example.org/psm/publisher',
        [0, 1]
      ),
      psmClass('https://example.org/psm/publisher', 'class-publisher', [
        'https://example.org/psm/publisher-name',
      ]),
      attribute(
        'https://example.org/psm/publisher-name',
        'name',
        'relationship-publisher-name',
        [1, 1]
      )
    );

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );
    const publisher = book?.fields.find((field) => field.path === 'publisher');

    expect(publisher).toMatchObject({
      kind: FieldKind.Association,
      targetClassIri: 'https://example.org/class/publisher',
      fields: [
        expect.objectContaining({
          path: 'name',
          kind: FieldKind.Primitive,
          datatype: 'http://www.w3.org/2001/XMLSchema#string',
        }),
      ],
    });
    expect(publisher?.targetAggregateIri).toBeUndefined();
  });

  it('rejects circular inline structures', () => {
    const fixture = dataspecerFixture();
    fixture.aggregatedSemanticModel.push(
      semanticClass('class-publisher', 'https://example.org/class/publisher', 'Publisher'),
      semanticRelationship(
        'relationship-publisher',
        'Publisher',
        'class-book',
        'class-publisher',
        [0, 1]
      ),
      semanticRelationship(
        'relationship-parent',
        'Parent',
        'class-publisher',
        'class-publisher',
        [0, 1]
      )
    );
    const bookClass = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/book'
    ) as DataPsmClass;
    bookClass.dataPsmParts = [...bookClass.dataPsmParts, 'https://example.org/psm/book-publisher'];
    fixture.structureModels[0].push(
      association(
        'https://example.org/psm/book-publisher',
        'publisher',
        'relationship-publisher',
        'https://example.org/psm/publisher',
        [0, 1]
      ),
      psmClass('https://example.org/psm/publisher', 'class-publisher', [
        'https://example.org/psm/publisher-parent',
      ]),
      association(
        'https://example.org/psm/publisher-parent',
        'parent',
        'relationship-parent',
        'https://example.org/psm/publisher',
        [0, 1]
      )
    );

    try {
      mapDataspecerSpecificationToMetadata(specificationIri, fixture);
      expect.unreachable('Expected mapping to fail on a circular inline structure.');
    } catch (error) {
      expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
      expect((error as DataspecerMetadataMappingError).issues).toContainEqual(
        expect.objectContaining({
          code: DataspecerMetadataMappingIssueCode.CircularStructure,
        })
      );
    }
  });

  it('maps a real getSpecification payload', () => {
    const source = JSON.parse(
      readFileSync(
        new URL('./fixtures/metadata/real-specification-source.json', import.meta.url),
        'utf8'
      )
    ) as SpecificationSource;

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, source);

    expect(metadata.aggregates.map((aggregate) => aggregate.iri)).toEqual([
      '5f96e8ca-d6b0-4d7f-81d7-957bdefef4f5',
      'd32203ad-189d-4a1c-ab53-3741edca0b0a',
    ]);

    const destination = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'd32203ad-189d-4a1c-ab53-3741edca0b0a'
    );
    const inlineContact = destination?.fields.find((field) => field.path === 'kontakt_non_ref_0_N');
    const referencedContact = destination?.fields.find((field) => field.path === 'kontakt_ref_0_1');

    expect(inlineContact).toMatchObject({ kind: FieldKind.Association });
    expect(inlineContact?.targetAggregateIri).toBeUndefined();
    expect(inlineContact?.fields?.map((field) => field.path)).toEqual([
      'má_e-mailovou_adresu',
      'má_url',
    ]);
    expect(referencedContact).toMatchObject({
      kind: FieldKind.Association,
      targetAggregateIri: '5f96e8ca-d6b0-4d7f-81d7-957bdefef4f5',
    });
    expect(referencedContact?.fields).toBeUndefined();
  });

  it('surfaces multi-root schemas as mapping issues', () => {
    const fixture = dataspecerFixture();
    const bookSchema = fixture.structureModels[0].find((resource) =>
      DataPsmSchema.is(resource)
    ) as DataPsmSchema;
    bookSchema.dataPsmRoots = [...bookSchema.dataPsmRoots, 'https://example.org/psm/chapter'];

    try {
      mapDataspecerSpecificationToMetadata(specificationIri, fixture);
      expect.unreachable('Expected mapping to fail on a multi-root schema.');
    } catch (error) {
      expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
      expect((error as DataspecerMetadataMappingError).issues).toContainEqual(
        expect.objectContaining({
          code: DataspecerMetadataMappingIssueCode.UnsupportedMultiRootSchema,
        })
      );
    }
  });

  it('surfaces missing association targets as mapping issues', () => {
    const fixture = dataspecerFixture();
    fixture.structureModels[0] = fixture.structureModels[0].filter(
      (resource) => resource.iri !== 'https://example.org/psm/author-ref'
    );

    expect(() => mapDataspecerSpecificationToMetadata(specificationIri, fixture)).toThrowError(
      DataspecerMetadataMappingError
    );

    try {
      mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    } catch (error) {
      expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
      expect((error as DataspecerMetadataMappingError).issues).toContainEqual(
        expect.objectContaining({
          code: DataspecerMetadataMappingIssueCode.MissingAssociationTarget,
        })
      );
    }
  });

  it('uses public concept IRIs when aggregated profiles expose local IRIs', () => {
    const fixture = dataspecerFixture();
    const bookClass = fixture.aggregatedSemanticModel.find((entity) => entity.id === 'class-book');
    const titleRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship | undefined;

    if (!bookClass || !titleRelationship) {
      throw new Error('Fixture setup failed.');
    }

    Object.assign(bookClass, {
      iri: 'book',
      conceptIris: ['https://example.org/class/book'],
    });
    Object.assign(titleRelationship.ends[1], {
      iri: 'title',
      conceptIris: ['https://example.org/property/book-title'],
    });

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(book?.classIri).toBe('https://example.org/class/book');
    expect(book?.fields.find((field) => field.path === 'title')?.propertyIri).toBe(
      'https://example.org/property/book-title'
    );
  });
});

describe('DataspecerSpecificationMetadataProvider', () => {
  it('loads a specification through the injected loader', async () => {
    const provider = new DataspecerSpecificationMetadataProvider((iri) => {
      expect(iri).toBe(specificationIri);
      return Promise.resolve(dataspecerFixture());
    });

    await expect(provider.getSpecificationMetadata(specificationIri)).resolves.toMatchObject({
      dataSpecificationIri: specificationIri,
      aggregates: expect.arrayContaining([
        expect.objectContaining({
          iri: 'https://example.org/aggregate/book-detail',
        }),
      ]),
    });
  });
});

function dataspecerFixture(): SpecificationSource {
  return {
    aggregatedSemanticModel: [
      semanticClass('class-book', 'https://example.org/class/book', 'Book'),
      semanticClass('class-chapter', 'https://example.org/class/chapter', 'Chapter'),
      semanticClass('class-author', 'https://example.org/class/author', 'Author'),
      semanticRelationship(
        'relationship-title',
        'Title',
        'class-book',
        'http://www.w3.org/2001/XMLSchema#string',
        [1, 1]
      ),
      semanticRelationship('relationship-chapters', 'Chapters', 'class-book', 'class-chapter', [
        0,
        null,
      ]),
      semanticRelationship('relationship-author', 'Author', 'class-book', 'class-author', [0, 1]),
    ],
    structureModels: [
      [
        schema('https://example.org/aggregate/book-detail', 'https://example.org/psm/book'),
        psmClass('https://example.org/psm/book', 'class-book', [
          'https://example.org/psm/title',
          'https://example.org/psm/chapters',
          'https://example.org/psm/book-author',
        ]),
        attribute('https://example.org/psm/title', 'title', 'relationship-title', [1, 1]),
        association(
          'https://example.org/psm/chapters',
          'chapters',
          'relationship-chapters',
          'https://example.org/psm/chapter',
          [0, null]
        ),
        association(
          'https://example.org/psm/book-author',
          'author',
          'relationship-author',
          'https://example.org/psm/author-ref',
          [0, 1]
        ),
        classReference(
          'https://example.org/psm/author-ref',
          'https://example.org/aggregate/author-detail',
          'https://example.org/psm/author'
        ),
      ],
      [
        schema('https://example.org/aggregate/chapter-detail', 'https://example.org/psm/chapter'),
        psmClass('https://example.org/psm/chapter', 'class-chapter', []),
      ],
      [
        schema('https://example.org/aggregate/author-detail', 'https://example.org/psm/author'),
        psmClass('https://example.org/psm/author', 'class-author', []),
      ],
    ],
  };
}

function semanticClass(id: string, iri: string, label: string): SemanticModelClass {
  return {
    id,
    iri,
    type: ['class'],
    name: { en: label },
    description: {},
  };
}

function semanticRelationship(
  id: string,
  label: string,
  sourceConcept: string,
  targetConcept: string,
  targetCardinality: [number, number | null]
): SemanticModelRelationship {
  return {
    id,
    iri: `https://example.org/relationship/${id}`,
    type: ['relationship'],
    name: { en: label },
    description: {},
    ends: [
      {
        iri: null,
        name: {},
        description: {},
        concept: sourceConcept,
      },
      {
        iri: `https://example.org/property/${id}`,
        name: { en: label },
        description: {},
        concept: targetConcept,
        cardinality: targetCardinality,
      },
    ],
  };
}

function schema(iri: string, rootIri: string): DataPsmSchema {
  const resource = new DataPsmSchema(iri);
  resource.dataPsmRoots = [rootIri];
  resource.dataPsmHumanLabel = { en: localName(iri) };
  return resource;
}

function psmClass(iri: string, interpretation: string, parts: string[]): DataPsmClass {
  const resource = new DataPsmClass(iri);
  resource.dataPsmInterpretation = interpretation;
  resource.dataPsmParts = parts;
  return resource;
}

function attribute(
  iri: string,
  technicalLabel: string,
  interpretation: string,
  cardinality: [number, number | null]
): DataPsmAttribute {
  const resource = new DataPsmAttribute(iri);
  resource.dataPsmTechnicalLabel = technicalLabel;
  resource.dataPsmHumanLabel = { en: titleCase(technicalLabel) };
  resource.dataPsmInterpretation = interpretation;
  resource.dataPsmDatatype = 'http://www.w3.org/2001/XMLSchema#string';
  resource.dataPsmCardinality = cardinality;
  return resource;
}

function association(
  iri: string,
  technicalLabel: string,
  interpretation: string,
  target: string,
  cardinality: [number, number | null]
): DataPsmAssociationEnd {
  const resource = new DataPsmAssociationEnd(iri);
  resource.dataPsmTechnicalLabel = technicalLabel;
  resource.dataPsmHumanLabel = { en: titleCase(technicalLabel) };
  resource.dataPsmInterpretation = interpretation;
  resource.dataPsmPart = target;
  resource.dataPsmCardinality = cardinality;
  return resource;
}

function classReference(
  iri: string,
  specification: string,
  psmClassIri: string
): DataPsmClassReference {
  const resource = new DataPsmClassReference(iri);
  resource.dataPsmSpecification = specification;
  resource.dataPsmClass = psmClassIri;
  return resource;
}

function localName(iri: string): string {
  return titleCase(iri.slice(iri.lastIndexOf('/') + 1).replace('-detail', ' detail'));
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
