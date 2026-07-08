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
import type { DataspecerSpecificationSource } from '../src/metadata/dataspecer-specification-source.ts';
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

function dataspecerFixture(): DataspecerSpecificationSource {
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
