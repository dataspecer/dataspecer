import { readFileSync } from 'node:fs';

import { DataPsmAssociationEnd } from '@dataspecer/core/data-psm/model/data-psm-association-end';
import { DataPsmAttribute } from '@dataspecer/core/data-psm/model/data-psm-attribute';
import { DataPsmClass } from '@dataspecer/core/data-psm/model/data-psm-class';
import { DataPsmClassReference } from '@dataspecer/core/data-psm/model/data-psm-class-reference';
import { DataPsmInclude } from '@dataspecer/core/data-psm/model/data-psm-include';
import { DataPsmOr } from '@dataspecer/core/data-psm/model/data-psm-or';
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
          minCount: 1,
          maxCount: 1,
        },
        {
          path: 'chapters',
          label: 'Chapters',
          kind: FieldKind.Association,
          propertyIri: 'https://example.org/property/relationship-chapters',
          targetAggregateIri: 'https://example.org/aggregate/chapter-detail',
          targetClassIri: 'https://example.org/class/chapter',
          targetIdentityPolicy: 'ALWAYS',
          many: true,
          required: false,
          minCount: 0,
          maxCount: null,
        },
        {
          path: 'author',
          label: 'Author',
          kind: FieldKind.Association,
          propertyIri: 'https://example.org/property/relationship-author',
          targetAggregateIri: 'https://example.org/aggregate/author-detail',
          targetClassIri: 'https://example.org/class/author',
          targetIdentityPolicy: 'ALWAYS',
          many: false,
          required: false,
          minCount: 0,
          maxCount: 1,
        },
      ],
    });
  });

  it('maps primitive and reference value constraints from the semantic model', () => {
    const fixture = dataspecerFixture();
    const title = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship;
    Object.assign(title.ends[1], {
      regex: '^Book .+$',
      example: ['Book one'],
    });
    const author = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'class-author'
    ) as SemanticModelClass;
    Object.assign(author, {
      regex: '^https://example\\.org/author/.+$',
      example: ['https://example.org/author/1'],
    });

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(book?.fields.find((field) => field.path === 'title')).toMatchObject({
      patterns: ['^Book .+$'],
      examples: ['Book one'],
    });
    expect(book?.fields.find((field) => field.path === 'author')).toMatchObject({
      patterns: ['^https://example\\.org/author/.+$'],
      examples: ['https://example.org/author/1'],
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

  it('flattens direct class Includes in source order', () => {
    const fixture = dataspecerFixture();
    fixture.aggregatedSemanticModel.push(
      semanticRelationship(
        'relationship-subtitle',
        'Subtitle',
        'class-book',
        'http://www.w3.org/2001/XMLSchema#string',
        [0, 1]
      )
    );
    const bookClass = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/book'
    ) as DataPsmClass;
    bookClass.dataPsmParts = [
      'https://example.org/psm/title',
      'https://example.org/psm/include-common',
      'https://example.org/psm/chapters',
    ];
    fixture.structureModels[0].push(
      include(
        'https://example.org/psm/include-common',
        'https://example.org/psm/common-book-fields'
      ),
      psmClass('https://example.org/psm/common-book-fields', 'class-book', [
        'https://example.org/psm/subtitle',
      ]),
      attribute('https://example.org/psm/subtitle', 'subtitle', 'relationship-subtitle', [0, 1])
    );

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(book?.fields.map((field) => field.path)).toEqual(['title', 'subtitle', 'chapters']);
  });

  it('reports missing and circular Include targets', () => {
    const missingFixture = dataspecerFixture();
    const missingBook = missingFixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/book'
    ) as DataPsmClass;
    missingBook.dataPsmParts = ['https://example.org/psm/include-missing'];
    missingFixture.structureModels[0].push(
      include('https://example.org/psm/include-missing', 'https://example.org/psm/not-found')
    );

    const circularFixture = dataspecerFixture();
    const circularBook = circularFixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/book'
    ) as DataPsmClass;
    circularBook.dataPsmParts = ['https://example.org/psm/include-common'];
    circularFixture.structureModels[0].push(
      include(
        'https://example.org/psm/include-common',
        'https://example.org/psm/common-book-fields'
      ),
      psmClass('https://example.org/psm/common-book-fields', 'class-book', [
        'https://example.org/psm/include-book',
      ]),
      include('https://example.org/psm/include-book', 'https://example.org/psm/book')
    );

    expectMappingIssue(missingFixture, DataspecerMetadataMappingIssueCode.MissingIncludeTarget);
    expectMappingIssue(circularFixture, DataspecerMetadataMappingIssueCode.CircularInclude);
  });

  it('maps direct Or choices to one union field tree with stable specialization IRIs', () => {
    const fixture = dataspecerFixture();
    fixture.aggregatedSemanticModel.push(
      semanticClass('class-contact', 'https://example.org/class/contact', 'Contact'),
      semanticClass('class-organization', 'https://example.org/class/organization', 'Organization'),
      semanticClass('class-individual', 'https://example.org/class/individual', 'Individual'),
      semanticRelationship('relationship-contact', 'Contact', 'class-book', 'class-contact', [
        0,
        null,
      ]),
      semanticRelationship(
        'relationship-contact-name',
        'Contact name',
        'class-contact',
        'http://www.w3.org/2001/XMLSchema#string',
        [1, 1]
      )
    );
    const bookClass = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/book'
    ) as DataPsmClass;
    bookClass.dataPsmParts.push('https://example.org/psm/book-contact');
    const organization = psmClass(
      'https://example.org/psm/contact-organization',
      'class-organization',
      ['https://example.org/psm/include-contact-organization']
    );
    organization.dataPsmTechnicalLabel = 'Organization';
    organization.instancesHaveIdentity = 'NEVER';
    const individual = psmClass('https://example.org/psm/contact-individual', 'class-individual', [
      'https://example.org/psm/include-contact-individual',
    ]);
    individual.dataPsmTechnicalLabel = 'Individual';
    individual.instancesHaveIdentity = 'NEVER';
    fixture.structureModels[0].push(
      association(
        'https://example.org/psm/book-contact',
        'contacts',
        'relationship-contact',
        'https://example.org/psm/contact-or',
        [0, null]
      ),
      specializationOr('https://example.org/psm/contact-or', [organization.iri!, individual.iri!]),
      organization,
      individual,
      include(
        'https://example.org/psm/include-contact-organization',
        'https://example.org/psm/contact-common'
      ),
      include(
        'https://example.org/psm/include-contact-individual',
        'https://example.org/psm/contact-common'
      ),
      psmClass('https://example.org/psm/contact-common', 'class-contact', [
        'https://example.org/psm/contact-name',
      ]),
      attribute('https://example.org/psm/contact-name', 'name', 'relationship-contact-name', [1, 1])
    );

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const contact = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'contacts');

    expect(contact).toMatchObject({
      targetClassIri: 'https://example.org/class/contact',
      fields: [expect.objectContaining({ path: 'name' })],
      specializations: [
        {
          specializationIri: 'https://example.org/psm/contact-organization',
          label: 'Organization',
          classIri: 'https://example.org/class/organization',
          fieldPaths: ['name'],
          identityPolicy: 'NEVER',
        },
        {
          specializationIri: 'https://example.org/psm/contact-individual',
          label: 'Individual',
          classIri: 'https://example.org/class/individual',
          fieldPaths: ['name'],
          identityPolicy: 'NEVER',
        },
      ],
    });
    expect(contact?.fields).toHaveLength(1);
  });

  it('keeps same-class Or choices distinct and defaults their identity policy to ALWAYS', () => {
    const fixture = distributionSpecializationFixture();

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const distribution = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'distributions');

    expect(distribution?.fields?.map((field) => field.path)).toEqual([
      'title',
      'downloadUrl',
      'accessService',
    ]);
    expect(distribution?.specializations).toEqual([
      expect.objectContaining({
        specializationIri: 'https://example.org/psm/download-distribution',
        classIri: 'https://example.org/class/distribution',
        fieldPaths: ['title', 'downloadUrl'],
        identityPolicy: 'ALWAYS',
      }),
      expect.objectContaining({
        specializationIri: 'https://example.org/psm/service-distribution',
        classIri: 'https://example.org/class/distribution',
        fieldPaths: ['title', 'accessService'],
        identityPolicy: 'ALWAYS',
      }),
    ]);
  });

  it('does not deduplicate separate PSM fields only because their RDF shapes match', () => {
    const fixture = distributionSpecializationFixture();
    const accessRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-access-service'
    ) as SemanticModelRelationship;
    accessRelationship.ends[1].iri = 'https://example.org/property/relationship-download-url';

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const distribution = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'distributions');

    expect(distribution?.fields?.map((field) => field.path)).toEqual([
      'title',
      'downloadUrl',
      'accessService',
    ]);
  });

  it('allows same-predicate specialization fields with different validation cardinalities', () => {
    const fixture = distributionSpecializationFixture();
    const accessRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-access-service'
    ) as SemanticModelRelationship;
    accessRelationship.ends[1].iri = 'https://example.org/property/relationship-download-url';
    const accessAttribute = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/access-service'
    ) as DataPsmAttribute;
    accessAttribute.dataPsmCardinality = [1, 1];

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const distribution = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'distributions');

    expect(distribution?.fields?.map((field) => field.path)).toEqual([
      'title',
      'downloadUrl',
      'accessService',
    ]);
  });

  it('rejects incompatible field shapes for the same predicate across Or branches', () => {
    const fixture = distributionSpecializationFixture();
    const accessRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-access-service'
    ) as SemanticModelRelationship;
    accessRelationship.ends[1].iri = 'https://example.org/property/relationship-download-url';
    const accessAttribute = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/access-service'
    ) as DataPsmAttribute;
    accessAttribute.dataPsmDatatype = 'http://www.w3.org/2001/XMLSchema#integer';

    expectMappingIssue(
      fixture,
      DataspecerMetadataMappingIssueCode.ConflictingSpecializationFieldShape,
      'Align their datatype, scalar or repeated cardinality, direction, target, and nested fields'
    );
  });

  it('rejects root Or and non-class choices with actionable guidance', () => {
    const rootFixture = dataspecerFixture();
    const bookSchema = rootFixture.structureModels[0].find((resource) =>
      DataPsmSchema.is(resource)
    ) as DataPsmSchema;
    bookSchema.dataPsmRoots = ['https://example.org/psm/root-or'];
    rootFixture.structureModels[0].push(
      specializationOr('https://example.org/psm/root-or', ['https://example.org/psm/book'])
    );

    const nestedFixture = distributionSpecializationFixture();
    const distributionOr = nestedFixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/distribution-or'
    ) as DataPsmOr;
    distributionOr.dataPsmChoices[0] = 'https://example.org/psm/author-ref';

    expectMappingIssue(
      rootFixture,
      DataspecerMetadataMappingIssueCode.UnsupportedStructureRoot,
      'Create a separate data structure for each root or specialization.'
    );
    expectMappingIssue(
      nestedFixture,
      DataspecerMetadataMappingIssueCode.UnsupportedSpecializationChoice,
      'must be a class'
    );
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

  it('defaults missing cardinality to zero to many', () => {
    const fixture = dataspecerFixture();
    const titleAttribute = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/title'
    ) as DataPsmAttribute;
    delete (titleAttribute as { dataPsmCardinality?: unknown }).dataPsmCardinality;
    const titleRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship;
    delete (titleRelationship.ends[1] as { cardinality?: unknown }).cardinality;

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(book?.fields.find((field) => field.path === 'title')).toMatchObject({
      many: true,
      required: false,
      minCount: 0,
      maxCount: null,
    });
  });

  it('prefers a nonempty structure description and otherwise uses the semantic description', () => {
    const fixture = dataspecerFixture();
    const titleAttribute = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/title'
    ) as DataPsmAttribute;
    titleAttribute.dataPsmHumanDescription = { en: '', cs: 'Popis ze struktury.' };
    const chaptersAssociation = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/chapters'
    ) as DataPsmAssociationEnd;
    chaptersAssociation.dataPsmHumanDescription = {};
    const chaptersRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-chapters'
    ) as SemanticModelRelationship;
    chaptersRelationship.ends[1].description = { en: 'Description from the semantic model.' };

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const fields = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    )?.fields;

    expect(fields?.find((field) => field.path === 'title')?.description).toBe(
      'Popis ze struktury.'
    );
    expect(fields?.find((field) => field.path === 'chapters')?.description).toBe(
      'Description from the semantic model.'
    );
  });

  it('carries the identity policy of a direct association target', () => {
    const fixture = dataspecerFixture();
    const chapterClass = fixture.structureModels[1].find(
      (resource) => resource.iri === 'https://example.org/psm/chapter'
    ) as DataPsmClass;
    chapterClass.instancesHaveIdentity = 'NEVER';

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const chapters = metadata.aggregates
      .find((aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail')
      ?.fields.find((field) => field.path === 'chapters');

    expect(chapters?.targetIdentityPolicy).toBe('NEVER');
  });

  it('preserves cardinality bounds above one', () => {
    const fixture = dataspecerFixture();
    const titleAttribute = fixture.structureModels[0].find(
      (resource) => resource.iri === 'https://example.org/psm/title'
    ) as DataPsmAttribute;
    titleAttribute.dataPsmCardinality = [2, 5];

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(book?.fields.find((field) => field.path === 'title')).toMatchObject({
      many: true,
      required: true,
      minCount: 2,
      maxCount: 5,
    });
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
          code: DataspecerMetadataMappingIssueCode.UnsupportedStructureRoot,
        })
      );
    }
  });

  it('surfaces missing association targets as mapping issues', () => {
    const fixture = dataspecerFixture();
    fixture.structureModels[0] = fixture.structureModels[0].filter(
      (resource) => resource.iri !== 'https://example.org/psm/author-ref'
    );

    expect(() => mapDataspecerSpecificationToMetadata(specificationIri, fixture)).toThrow(
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
    const authorClass = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'class-author'
    );
    const titleRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship | undefined;

    if (!bookClass || !authorClass || !titleRelationship) {
      throw new Error('Fixture setup failed.');
    }

    Object.assign(bookClass, {
      iri: 'https://example.org/profile#Book',
      profiling: ['https://example.org/profiled#Book'],
      conceptIris: ['https://example.org/class/book'],
    });
    Object.assign(authorClass, {
      iri: 'https://example.org/profile#Author',
      profiling: ['https://example.org/profiled#Author'],
      conceptIris: ['https://example.org/class/author'],
      regex: '^https://example\\.org/author/.+$',
      example: ['https://example.org/author/1'],
    });
    Object.assign(titleRelationship.ends[1], {
      iri: 'https://example.org/profile#Book.title-attribute',
      profiling: ['https://example.org/profiled#Book.title-attribute'],
      conceptIris: ['https://example.org/property/book-title'],
      regex: '^Book .+$',
      example: ['Book one'],
    });

    const metadata = mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    const book = metadata.aggregates.find(
      (aggregate) => aggregate.iri === 'https://example.org/aggregate/book-detail'
    );

    expect(book?.classIri).toBe('https://example.org/class/book');
    expect(book?.fields.find((field) => field.path === 'title')?.propertyIri).toBe(
      'https://example.org/property/book-title'
    );
    expect(book?.fields.find((field) => field.path === 'title')).toMatchObject({
      patterns: ['^Book .+$'],
      examples: ['Book one'],
    });
    expect(book?.fields.find((field) => field.path === 'author')).toMatchObject({
      targetClassIri: 'https://example.org/class/author',
      patterns: ['^https://example\\.org/author/.+$'],
      examples: ['https://example.org/author/1'],
    });
  });

  it('recognizes aggregated profile type markers when profiling arrays are absent', () => {
    const fixture = dataspecerFixture();
    const bookClass = fixture.aggregatedSemanticModel.find((entity) => entity.id === 'class-book');
    const titleRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship | undefined;

    if (!bookClass || !titleRelationship) {
      throw new Error('Fixture setup failed.');
    }

    Object.assign(bookClass, {
      type: ['class', 'class-profile', 'aggregate'],
      iri: 'https://example.org/profile#Book',
      conceptIris: ['https://example.org/class/book'],
    });
    Object.assign(titleRelationship, {
      type: ['relationship', 'relationship-profile', 'aggregate'],
    });
    Object.assign(titleRelationship.ends[1], {
      iri: 'https://example.org/profile#Book.title-attribute',
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

  it('does not fall back to local IRIs for profile type markers without canonical IRIs', () => {
    const fixture = dataspecerFixture();
    const bookClass = fixture.aggregatedSemanticModel.find((entity) => entity.id === 'class-book');
    const titleRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship | undefined;

    if (!bookClass || !titleRelationship) {
      throw new Error('Fixture setup failed.');
    }

    Object.assign(bookClass, {
      type: ['class', 'class-profile', 'aggregate'],
      iri: 'https://example.org/profile#Book',
      conceptIris: [],
    });
    Object.assign(titleRelationship, {
      type: ['relationship', 'relationship-profile', 'aggregate'],
    });
    Object.assign(titleRelationship.ends[1], {
      iri: 'https://example.org/profile#Book.title-attribute',
      conceptIris: [],
    });

    try {
      mapDataspecerSpecificationToMetadata(specificationIri, fixture);
      expect.unreachable('Expected mapping to fail on unresolved profile IRIs.');
    } catch (error) {
      expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
      const issues = (error as DataspecerMetadataMappingError).issues;
      expect(issues).toContainEqual(
        expect.objectContaining({ code: DataspecerMetadataMappingIssueCode.MissingClassIri })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({ code: DataspecerMetadataMappingIssueCode.MissingFieldIri })
      );
    }
  });

  it.each([
    ['missing', []],
    ['ambiguous', ['https://example.org/property/first', 'https://example.org/property/second']],
    ['partly invalid', ['https://example.org/property/first', 'relative-property']],
  ])('rejects a used profile whose canonical relationship IRI is %s', (_case, conceptIris) => {
    const fixture = dataspecerFixture();
    const titleRelationship = fixture.aggregatedSemanticModel.find(
      (entity) => entity.id === 'relationship-title'
    ) as SemanticModelRelationship | undefined;

    if (!titleRelationship) {
      throw new Error('Fixture setup failed.');
    }

    Object.assign(titleRelationship.ends[1], {
      iri: 'https://example.org/profile#Book.title-attribute',
      profiling: ['https://example.org/profiled#Book.title-attribute'],
      conceptIris,
    });

    try {
      mapDataspecerSpecificationToMetadata(specificationIri, fixture);
      expect.unreachable('Expected mapping to fail on an unresolved profile IRI.');
    } catch (error) {
      expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
      expect((error as DataspecerMetadataMappingError).issues).toContainEqual(
        expect.objectContaining({
          code: DataspecerMetadataMappingIssueCode.MissingFieldIri,
        })
      );
    }
  });

  it.each([
    ['missing', []],
    ['ambiguous', ['https://example.org/class/first', 'https://example.org/class/second']],
  ])('rejects a used profile whose canonical class IRI is %s', (_case, conceptIris) => {
    const fixture = dataspecerFixture();
    const bookClass = fixture.aggregatedSemanticModel.find((entity) => entity.id === 'class-book');

    if (!bookClass) {
      throw new Error('Fixture setup failed.');
    }

    Object.assign(bookClass, {
      iri: 'https://example.org/profile#Book',
      profiling: ['https://example.org/profiled#Book'],
      conceptIris,
    });

    try {
      mapDataspecerSpecificationToMetadata(specificationIri, fixture);
      expect.unreachable('Expected mapping to fail on an unresolved profile IRI.');
    } catch (error) {
      expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
      expect((error as DataspecerMetadataMappingError).issues).toContainEqual(
        expect.objectContaining({
          code: DataspecerMetadataMappingIssueCode.MissingClassIri,
        })
      );
    }
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

function distributionSpecializationFixture(): SpecificationSource {
  const fixture = dataspecerFixture();
  const downloadClass = Object.assign(
    semanticClass(
      'class-download-distribution',
      'https://example.org/profile/download-distribution',
      'Download distribution'
    ),
    {
      profiling: ['class-distribution'],
      conceptIris: ['https://example.org/class/distribution'],
    }
  );
  const serviceClass = Object.assign(
    semanticClass(
      'class-service-distribution',
      'https://example.org/profile/service-distribution',
      'Service distribution'
    ),
    {
      profiling: ['class-distribution'],
      conceptIris: ['https://example.org/class/distribution'],
    }
  );
  fixture.aggregatedSemanticModel.push(
    semanticClass('class-distribution', 'https://example.org/class/distribution', 'Distribution'),
    downloadClass,
    serviceClass,
    semanticRelationship(
      'relationship-distributions',
      'Distributions',
      'class-book',
      'class-distribution',
      [0, null]
    ),
    semanticRelationship(
      'relationship-distribution-title',
      'Distribution title',
      'class-distribution',
      'http://www.w3.org/2001/XMLSchema#string',
      [1, 1]
    ),
    semanticRelationship(
      'relationship-download-url',
      'Download URL',
      'class-download-distribution',
      'http://www.w3.org/2001/XMLSchema#string',
      [0, 1]
    ),
    semanticRelationship(
      'relationship-access-service',
      'Access service',
      'class-service-distribution',
      'http://www.w3.org/2001/XMLSchema#string',
      [0, 1]
    )
  );

  const bookClass = fixture.structureModels[0].find(
    (resource) => resource.iri === 'https://example.org/psm/book'
  ) as DataPsmClass;
  bookClass.dataPsmParts.push('https://example.org/psm/book-distributions');

  const download = psmClass(
    'https://example.org/psm/download-distribution',
    'class-download-distribution',
    ['https://example.org/psm/include-download-common', 'https://example.org/psm/download-url']
  );
  download.dataPsmTechnicalLabel = 'Download distribution';
  const service = psmClass(
    'https://example.org/psm/service-distribution',
    'class-service-distribution',
    ['https://example.org/psm/include-service-common', 'https://example.org/psm/access-service']
  );
  service.dataPsmTechnicalLabel = 'Service distribution';

  fixture.structureModels[0].push(
    association(
      'https://example.org/psm/book-distributions',
      'distributions',
      'relationship-distributions',
      'https://example.org/psm/distribution-or',
      [0, null]
    ),
    specializationOr('https://example.org/psm/distribution-or', [download.iri!, service.iri!]),
    download,
    service,
    include(
      'https://example.org/psm/include-download-common',
      'https://example.org/psm/distribution-common'
    ),
    include(
      'https://example.org/psm/include-service-common',
      'https://example.org/psm/distribution-common'
    ),
    psmClass('https://example.org/psm/distribution-common', 'class-distribution', [
      'https://example.org/psm/distribution-title',
    ]),
    attribute(
      'https://example.org/psm/distribution-title',
      'title',
      'relationship-distribution-title',
      [1, 1]
    ),
    attribute(
      'https://example.org/psm/download-url',
      'downloadUrl',
      'relationship-download-url',
      [0, 1]
    ),
    attribute(
      'https://example.org/psm/access-service',
      'accessService',
      'relationship-access-service',
      [0, 1]
    )
  );

  return fixture;
}

function expectMappingIssue(
  fixture: SpecificationSource,
  code: DataspecerMetadataMappingIssueCode,
  expectedMessage?: string
): void {
  try {
    mapDataspecerSpecificationToMetadata(specificationIri, fixture);
    expect.unreachable(`Expected mapping issue ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(DataspecerMetadataMappingError);
    const issue = (error as DataspecerMetadataMappingError).issues.find(
      (candidate) => candidate.code === code
    );
    expect(issue).toBeDefined();
    if (expectedMessage) {
      expect(issue?.message).toContain(expectedMessage);
    }
  }
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

function include(iri: string, target: string): DataPsmInclude {
  const resource = new DataPsmInclude(iri);
  resource.dataPsmIncludes = target;
  return resource;
}

function specializationOr(iri: string, choices: string[]): DataPsmOr {
  const resource = new DataPsmOr(iri);
  resource.dataPsmChoices = choices;
  return resource;
}

function localName(iri: string): string {
  return titleCase(iri.slice(iri.lastIndexOf('/') + 1).replace('-detail', ' detail'));
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
