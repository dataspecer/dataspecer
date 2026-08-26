import { createLens } from 'ldkit';
import { describe, expect, it } from 'vitest';

import {
  AssociationKind,
  DatasourceType,
  Operation,
  type ApplicationGraph,
  type ApplicationNodeConfig,
} from '../src/graph/types.ts';
import { buildAggregateDescriptor } from '../src/generation-model/aggregate-descriptor.ts';
import {
  FieldKind,
  type AggregateFieldMetadata,
  type SpecificationMetadata,
} from '../src/metadata/types.ts';
import { buildLdkitSchemaBundle } from '../src/rendering/ldkit-schema.ts';
import { toRenderedAggregate } from '../src/rendering/rendered-aggregate.ts';
import { analyzeGraphSemantics } from '../src/validation/analyze-semantics.ts';
import { ViolationSeverity } from '../src/validation/types.ts';
import { ViolationCode } from '../src/validation/violation-codes.ts';

const AGGREGATE_IRI = 'https://example.org/aggregate/dataset';
const CLASS_IRI = 'http://www.w3.org/ns/dcat#Dataset';
const SPATIAL = 'http://purl.org/dc/terms/spatial';
const THEME = 'http://www.w3.org/ns/dcat#theme';
const LOCATION = 'http://purl.org/dc/terms/Location';
const CONCEPT = 'http://www.w3.org/2004/02/skos/core#Concept';

describe('RDF property aliases', () => {
  it('coalesces the NKOD spatial and theme aliases and builds valid LDKit schemas', () => {
    const result = analyzeGraphSemantics(
      graph(),
      metadata([
        {
          ...association('téma', THEME, CONCEPT, 1, null),
          patterns: ['^https://example\\.org/theme/'],
          examples: ['https://example.org/theme/transport'],
        },
        {
          ...association('geografické_území', SPATIAL, LOCATION, 0, null),
          examples: ['https://example.org/place/prague'],
        },
        {
          ...association('prvek_rúian', SPATIAL, LOCATION, 0, null),
          patterns: ['^https://example\\.org/ruian/'],
          examples: ['https://example.org/ruian/1'],
        },
        {
          ...association('koncept_euroVoc', THEME, CONCEPT, 0, null),
          patterns: ['^https://example\\.org/eurovoc/'],
          examples: ['https://example.org/eurovoc/1001'],
        },
      ]),
    );

    expect(result.valid).toBe(true);
    const warnings = result.violations.filter(
      (violation) => violation.code === ViolationCode.SemanticRdfPropertyAliasesCoalesced,
    );
    expect(warnings).toHaveLength(2);
    expect(warnings.map((warning) => warning.message).join(' ')).toContain('prvek_rúian');
    expect(warnings.map((warning) => warning.message).join(' ')).toContain('koncept_euroVoc');

    const aggregate = requiredAggregate(result.enrichedMetadata);
    expect(aggregate.fields.map((field) => field.path)).toEqual(['téma', 'geografické_území']);
    expect(aggregate.fields[0]).toMatchObject({ required: true, minCount: 1, maxCount: null });
    expect(aggregate.fields[1]).toMatchObject({ required: false, minCount: 0, maxCount: null });
    expect(aggregate.fields[0]).toMatchObject({
      patterns: ['^https://example\\.org/theme/', '^https://example\\.org/eurovoc/'],
      examples: ['https://example.org/theme/transport', 'https://example.org/eurovoc/1001'],
    });
    expect(aggregate.fields[1].patterns).toBeUndefined();
    expect(aggregate.fields[1].examples).toEqual([
      'https://example.org/place/prague',
      'https://example.org/ruian/1',
    ]);

    const rendered = toRenderedAggregate(buildAggregateDescriptor(aggregate));
    expect(rendered.descriptorFields[0]).toMatchObject({
      patterns: ['^https://example\\.org/theme/', '^https://example\\.org/eurovoc/'],
      examples: ['https://example.org/theme/transport', 'https://example.org/eurovoc/1001'],
    });
    const schemas = buildLdkitSchemaBundle(rendered.classIri, rendered.fields);
    const context = { sources: ['https://example.org/sparql'] };
    expect(() => createLens(schemas.detail, context)).not.toThrow();
    expect(() => createLens(schemas.list, context)).not.toThrow();
    Object.values(schemas.writes).forEach((schema) => {
      expect(() => createLens(schema, context)).not.toThrow();
    });
  });

  it('coalesces aliases recursively and updates specialization field membership', () => {
    const contact: AggregateFieldMetadata = {
      ...association('contact', 'https://example.org/contact', 'https://example.org/Contact', 0, 1),
      fields: [
        primitive('email', 'https://example.org/email'),
        primitive('electronic_mail', 'https://example.org/email'),
      ],
      specializations: [
        specialization('https://example.org/psm/person', ['email']),
        specialization('https://example.org/psm/organization', ['electronic_mail']),
      ],
    };
    const result = analyzeGraphSemantics(
      graph(Operation.Update, {
        associations: { contact: AssociationKind.Composition },
      }),
      metadata([contact]),
    );

    expect(result.valid).toBe(true);
    const normalized = requiredAggregate(result.enrichedMetadata).fields[0];
    expect(normalized.fields?.map((field) => field.path)).toEqual(['email']);
    expect(normalized.specializations?.map((item) => item.fieldPaths)).toEqual([
      ['email'],
      ['email'],
    ]);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticRdfPropertyAliasesCoalesced,
        severity: ViolationSeverity.Warning,
      }),
    );
  });

  it('rejects aliases with incompatible RDF storage shapes', () => {
    const result = analyzeGraphSemantics(
      graph(),
      metadata([
        association('spatial', SPATIAL, LOCATION, 0, null),
        association('spatial_concept', SPATIAL, CONCEPT, 0, null),
      ]),
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticConflictingRdfPropertyAlias,
        severity: ViolationSeverity.Error,
      }),
    );
  });

  it('does not coalesce display-only fields of an aggregation', () => {
    const first = primitive('name', 'https://example.org/name');
    const second = {
      ...primitive('number', 'https://example.org/name'),
      datatype: 'http://www.w3.org/2001/XMLSchema#integer',
    };
    const reference = {
      ...association(
        'reference',
        'https://example.org/reference',
        'https://example.org/Reference',
        0,
        1,
      ),
      fields: [first, second],
    };
    const result = analyzeGraphSemantics(
      graph(Operation.ReadDetail, {
        associations: { reference: AssociationKind.Aggregation },
      }),
      metadata([reference]),
    );

    expect(result.valid).toBe(true);
    expect(requiredAggregate(result.enrichedMetadata).fields[0].fields).toEqual([first, second]);
    expect(result.violations).not.toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticConflictingRdfPropertyAlias }),
    );
  });

  it('coalesces aggregation aliases when only their display fields differ', () => {
    const propertyIri = 'https://example.org/reference';
    const targetClassIri = 'https://example.org/Reference';
    const first = {
      ...association('first', propertyIri, targetClassIri, 0, 1),
      fields: [primitive('name', 'https://example.org/name')],
    };
    const second = {
      ...association('second', propertyIri, targetClassIri, 0, 1),
      fields: [primitive('title', 'https://example.org/title')],
    };
    const result = analyzeGraphSemantics(graph(), metadata([first, second]));

    expect(result.valid).toBe(true);
    expect(requiredAggregate(result.enrichedMetadata).fields.map((field) => field.path)).toEqual([
      'first',
    ]);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: ViolationCode.SemanticRdfPropertyAliasesCoalesced }),
    );
  });

  it('rejects application-graph configuration that names a removed alias', () => {
    const result = analyzeGraphSemantics(
      graph(Operation.Update, {
        associations: { prvek_rúian: AssociationKind.Aggregation },
      }),
      metadata([
        association('geografické_území', SPATIAL, LOCATION, 0, null),
        association('prvek_rúian', SPATIAL, LOCATION, 0, null),
      ]),
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticRdfPropertyAliasConfigPath,
        message: expect.stringContaining('geografické_území'),
        severity: ViolationSeverity.Error,
      }),
    );
  });

  it('widens two scalar aliases so every predicate value remains visible', () => {
    const result = analyzeGraphSemantics(
      graph(),
      metadata([
        primitive('primary_code', 'https://example.org/code'),
        primitive('secondary_code', 'https://example.org/code'),
      ]),
    );

    const code = requiredAggregate(result.enrichedMetadata).fields[0];
    expect(result.valid).toBe(true);
    expect(code).toMatchObject({ path: 'primary_code', many: true, minCount: 0, maxCount: 2 });
  });

  it('warns and ignores regex patterns that JavaScript cannot compile', () => {
    const result = analyzeGraphSemantics(
      graph(),
      metadata([
        {
          ...primitive('code', 'https://example.org/code'),
          patterns: ['['],
          examples: ['ABC'],
        },
      ]),
    );

    expect(result.valid).toBe(true);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        code: ViolationCode.SemanticInvalidRegexPattern,
        severity: ViolationSeverity.Warning,
      }),
    );
    expect(requiredAggregate(result.enrichedMetadata).fields[0]).toMatchObject({
      examples: ['ABC'],
    });
    expect(requiredAggregate(result.enrichedMetadata).fields[0].patterns).toBeUndefined();
  });
});

function graph(
  operation: Operation = Operation.ReadDetail,
  config?: ApplicationNodeConfig,
): ApplicationGraph {
  return {
    name: 'Dataset editor',
    dataSpecificationIri: 'https://example.org/specification',
    datasources: [
      {
        id: 'main',
        type: DatasourceType.Rdf,
        endpoint: 'https://example.org/sparql',
      },
    ],
    nodes: [
      {
        id: `Dataset.${operation}`,
        aggregateIri: AGGREGATE_IRI,
        operation,
        ...(config ? { config } : {}),
      },
    ],
    edges: [],
  };
}

function metadata(fields: AggregateFieldMetadata[]): SpecificationMetadata {
  return {
    dataSpecificationIri: 'https://example.org/specification',
    aggregates: [
      {
        iri: AGGREGATE_IRI,
        name: 'Dataset',
        classIri: CLASS_IRI,
        fields,
      },
    ],
  };
}

function association(
  path: string,
  propertyIri: string,
  targetClassIri: string,
  minCount: number,
  maxCount: number | null,
): AggregateFieldMetadata {
  return {
    path,
    label: path,
    kind: FieldKind.Association,
    propertyIri,
    targetClassIri,
    required: minCount > 0,
    many: maxCount === null || maxCount > 1,
    minCount,
    maxCount,
  };
}

function primitive(path: string, propertyIri: string): AggregateFieldMetadata {
  return {
    path,
    label: path,
    kind: FieldKind.Primitive,
    propertyIri,
    datatype: 'http://www.w3.org/2001/XMLSchema#string',
    required: false,
    many: false,
    minCount: 0,
    maxCount: 1,
  };
}

function specialization(specializationIri: string, fieldPaths: string[]) {
  return {
    specializationIri,
    label: specializationIri,
    classIri: `${specializationIri}/class`,
    identityPolicy: 'ALWAYS' as const,
    fieldPaths,
  };
}

function requiredAggregate(metadata: SpecificationMetadata) {
  const aggregate = metadata.aggregates.find((item) => item.iri === AGGREGATE_IRI);
  if (!aggregate) {
    throw new Error('Missing test aggregate.');
  }
  return aggregate;
}
