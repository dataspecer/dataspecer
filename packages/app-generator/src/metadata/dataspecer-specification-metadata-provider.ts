import { sortBy } from 'es-toolkit';

import { DataPsmAssociationEnd } from '@dataspecer/core/data-psm/model/data-psm-association-end';
import { DataPsmAttribute } from '@dataspecer/core/data-psm/model/data-psm-attribute';
import { DataPsmClass } from '@dataspecer/core/data-psm/model/data-psm-class';
import { DataPsmClassReference } from '@dataspecer/core/data-psm/model/data-psm-class-reference';
import { DataPsmSchema } from '@dataspecer/core/data-psm/model/data-psm-schema';
import {
  isSemanticModelClass,
  isSemanticModelRelationship,
  type LanguageString,
  type SemanticModelClass,
  type SemanticModelRelationship,
  type SemanticModelRelationshipEnd,
} from '@dataspecer/core-v2/semantic-model/concepts';

import type { Entity } from '@dataspecer/core-v2/entity-model';

import type {
  AggregatedSemanticModelClass,
  AggregatedSemanticModelRelationshipEnd,
  SpecificationSourceLoader,
  SpecificationSource,
  StructureModelResource,
} from './specification-source.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type DataspecerMetadataProvider,
  type SpecificationMetadata,
  FieldKind,
} from './types.ts';

export interface DataspecerMetadataMappingIssue {
  code: DataspecerMetadataMappingIssueCode;
  message: string;
  path?: string;
}

export enum DataspecerMetadataMappingIssueCode {
  MissingStructureModels = 'MISSING_STRUCTURE_MODELS',
  MissingSchema = 'MISSING_SCHEMA',
  MissingSchemaIri = 'MISSING_SCHEMA_IRI',
  MissingRootClass = 'MISSING_ROOT_CLASS',
  MissingClassInterpretation = 'MISSING_CLASS_INTERPRETATION',
  MissingClassIri = 'MISSING_CLASS_IRI',
  MissingFieldResource = 'MISSING_FIELD_RESOURCE',
  MissingFieldInterpretation = 'MISSING_FIELD_INTERPRETATION',
  MissingAssociationTarget = 'MISSING_ASSOCIATION_TARGET',
  MissingTargetAggregate = 'MISSING_TARGET_AGGREGATE',
  UnsupportedFieldResource = 'UNSUPPORTED_FIELD_RESOURCE',
  UnsupportedMultiRootSchema = 'UNSUPPORTED_MULTI_ROOT_SCHEMA',
  CircularStructure = 'CIRCULAR_STRUCTURE',
}

export class DataspecerMetadataMappingError extends Error {
  constructor(readonly issues: DataspecerMetadataMappingIssue[]) {
    super(
      `Unable to map Dataspecer specification metadata: ${issues
        .map((issue) => issue.message)
        .join('; ')}`
    );
    this.name = 'DataspecerMetadataMappingError';
  }
}

type Cardinality = [number, number | null];

interface MappingContext {
  semanticEntities: SemanticEntityIndex;
  resourcesByIri: Map<string, StructureModelResource>;
  schemaIriByRootClassIri: Map<string, string>;
  issues: DataspecerMetadataMappingIssue[];
}

interface SemanticEntityIndex {
  byKey: Map<string, Entity>;
}

export class DataspecerSpecificationMetadataProvider implements DataspecerMetadataProvider {
  constructor(private readonly loadSpecification: SpecificationSourceLoader) {}

  async getSpecificationMetadata(dataSpecificationIri: string): Promise<SpecificationMetadata> {
    const specification = await this.loadSpecification(dataSpecificationIri);
    return mapDataspecerSpecificationToMetadata(dataSpecificationIri, specification);
  }
}

export function mapDataspecerSpecificationToMetadata(
  dataSpecificationIri: string,
  specification: SpecificationSource
): SpecificationMetadata {
  const context = buildMappingContext(specification);
  const aggregates = specification.structureModels.flatMap((structureModel, index) =>
    mapStructureModel(structureModel, index, context)
  );

  if (specification.structureModels.length === 0) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingStructureModels,
      message: 'Specification does not contain any structure models.',
      path: 'structureModels',
    });
  }

  if (context.issues.length > 0) {
    throw new DataspecerMetadataMappingError(context.issues);
  }

  return {
    dataSpecificationIri,
    aggregates: sortBy(aggregates, [(aggregate) => aggregate.iri]),
  };
}

function buildMappingContext(specification: SpecificationSource): MappingContext {
  const resourcesByIri = new Map<string, StructureModelResource>();
  const schemaIriByRootClassIri = new Map<string, string>();

  for (const resource of specification.structureModels.flat()) {
    if (resource.iri) {
      resourcesByIri.set(resource.iri, resource);
    }
  }

  for (const resource of resourcesByIri.values()) {
    if (!DataPsmSchema.is(resource) || !resource.iri) {
      continue;
    }
    for (const rootClassIri of resource.dataPsmRoots) {
      schemaIriByRootClassIri.set(rootClassIri, resource.iri);
    }
  }

  return {
    semanticEntities: buildSemanticEntityIndex(specification.aggregatedSemanticModel),
    resourcesByIri,
    schemaIriByRootClassIri,
    issues: [],
  };
}

function buildSemanticEntityIndex(entities: Entity[]): SemanticEntityIndex {
  const byKey = new Map<string, Entity>();

  for (const entity of entities) {
    for (const key of entityKeys(entity)) {
      byKey.set(key, entity);
    }
  }

  return { byKey };
}

function mapStructureModel(
  structureModel: StructureModelResource[],
  structureModelIndex: number,
  context: MappingContext
): AggregateMetadata[] {
  const schema = structureModel.find((resource) => DataPsmSchema.is(resource));
  const path = `structureModels[${structureModelIndex}]`;

  if (!schema) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingSchema,
      message: `Structure model ${structureModelIndex} does not contain a Data PSM schema.`,
      path,
    });
    return [];
  }

  if (!schema.iri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingSchemaIri,
      message: `Structure model ${structureModelIndex} schema is missing an IRI.`,
      path,
    });
    return [];
  }

  if (schema.dataPsmRoots.length > 1) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.UnsupportedMultiRootSchema,
      message: `Structure model "${schema.iri}" has ${schema.dataPsmRoots.length} roots; multi-root (OR) schemas are not supported.`,
      path: `${path}.dataPsmRoots`,
    });
    return [];
  }

  const rootClassIri = schema.dataPsmRoots[0];
  const rootClass = rootClassIri ? context.resourcesByIri.get(rootClassIri) : undefined;

  if (!rootClassIri || !rootClass || !DataPsmClass.is(rootClass)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingRootClass,
      message: `Structure model "${schema.iri}" does not have a resolvable root class.`,
      path: `${path}.dataPsmRoots[0]`,
    });
    return [];
  }

  const semanticClass = getSemanticClass(rootClass.dataPsmInterpretation, context);
  const classIri = semanticClass ? publicClassIri(semanticClass) : undefined;

  if (!rootClass.dataPsmInterpretation || !semanticClass) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingClassInterpretation,
      message: `Root class "${rootClassIri}" does not resolve to a semantic class.`,
      path: resourcePath(rootClass),
    });
  }

  if (!classIri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingClassIri,
      message: `Root class "${rootClassIri}" semantic class is missing a public IRI.`,
      path: resourcePath(rootClass),
    });
  }

  return [
    {
      iri: schema.iri,
      name:
        labelFrom(schema.dataPsmHumanLabel) ??
        labelFrom(semanticClass?.name) ??
        localName(schema.iri),
      classIri: classIri ?? '',
      fields: mapClassFields(rootClass, context, `${path}.root`, visitedClasses(rootClass)),
    },
  ];
}

function mapClassFields(
  psmClass: DataPsmClass,
  context: MappingContext,
  path: string,
  visited: ReadonlySet<string>
): AggregateFieldMetadata[] {
  return psmClass.dataPsmParts.flatMap((partIri, index) => {
    const part = context.resourcesByIri.get(partIri);
    const fieldPath = `${path}.dataPsmParts[${index}]`;

    if (!part) {
      addIssue(context, {
        code: DataspecerMetadataMappingIssueCode.MissingFieldResource,
        message: `Class part "${partIri}" does not resolve to a structure resource.`,
        path: fieldPath,
      });
      return [];
    }

    if (DataPsmAttribute.is(part)) {
      return [mapAttributeField(part, context, fieldPath)];
    }

    if (DataPsmAssociationEnd.is(part)) {
      const field = mapAssociationField(part, context, fieldPath, visited);
      return field ? [field] : [];
    }

    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.UnsupportedFieldResource,
      message: `Class part "${partIri}" has unsupported resource type.`,
      path: fieldPath,
    });
    return [];
  });
}

function mapAttributeField(
  attribute: DataPsmAttribute,
  context: MappingContext,
  path: string
): AggregateFieldMetadata {
  const relationship = getSemanticRelationship(attribute.dataPsmInterpretation, context);
  const valueEnd = relationship?.ends[1];
  const fieldPath = fieldPathFrom(attribute, relationship);
  const cardinality = attribute.dataPsmCardinality ?? valueEnd?.cardinality;
  const propertyIri = relationshipPropertyIri(relationship);

  if (!attribute.dataPsmInterpretation || !relationship) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingFieldInterpretation,
      message: `Attribute "${attribute.iri ?? fieldPath}" does not resolve to a semantic relationship.`,
      path,
    });
  }

  return {
    path: fieldPath,
    label: fieldLabelFrom(attribute, relationship, valueEnd, fieldPath),
    kind: FieldKind.Primitive,
    ...(propertyIri ? { propertyIri } : {}),
    ...((attribute.dataPsmDatatype ?? valueEnd?.concept)
      ? { datatype: attribute.dataPsmDatatype ?? valueEnd?.concept ?? undefined }
      : {}),
    ...cardinalityFlags(cardinality),
  };
}

function mapAssociationField(
  association: DataPsmAssociationEnd,
  context: MappingContext,
  path: string,
  visited: ReadonlySet<string>
): AggregateFieldMetadata | null {
  const relationship = getSemanticRelationship(association.dataPsmInterpretation, context);
  const targetEnd = association.dataPsmIsReverse ? relationship?.ends[0] : relationship?.ends[1];
  const targetResource = association.dataPsmPart
    ? context.resourcesByIri.get(association.dataPsmPart)
    : undefined;
  const fieldPath = fieldPathFrom(association, relationship);
  const cardinality = association.dataPsmCardinality ?? targetEnd?.cardinality;
  const propertyIri = relationshipPropertyIri(relationship);

  if (!association.dataPsmInterpretation || !relationship) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingFieldInterpretation,
      message: `Association "${association.iri ?? fieldPath}" does not resolve to a semantic relationship.`,
      path,
    });
  }

  if (!targetResource || !isAssociationTargetResource(targetResource)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingAssociationTarget,
      message: `Association "${association.iri ?? fieldPath}" does not resolve to a target class or class reference.`,
      path,
    });
    return null;
  }

  const targetClassIri = targetClassIriFrom(targetResource, targetEnd, context);
  const target = resolveAssociationTarget(association, targetResource, fieldPath, context, visited);

  return {
    path: fieldPath,
    label: fieldLabelFrom(association, relationship, targetEnd, fieldPath),
    kind: FieldKind.Association,
    ...(propertyIri ? { propertyIri } : {}),
    ...(target.targetAggregateIri ? { targetAggregateIri: target.targetAggregateIri } : {}),
    ...(targetClassIri ? { targetClassIri } : {}),
    ...cardinalityFlags(cardinality),
    ...(target.fields ? { fields: target.fields } : {}),
  };
}

interface ResolvedAssociationTarget {
  targetAggregateIri?: string;
  fields?: AggregateFieldMetadata[];
}

/**
 * An association target is either a reference to another aggregate (a class reference or the root
 * class of another structure model) or a class defined inline within the current aggregate's
 * structure tree. Inline classes contribute nested fields. References contribute a target
 * aggregate IRI.
 */
function resolveAssociationTarget(
  association: DataPsmAssociationEnd,
  targetResource: DataPsmClass | DataPsmClassReference,
  fieldPath: string,
  context: MappingContext,
  visited: ReadonlySet<string>
): ResolvedAssociationTarget {
  if (DataPsmClassReference.is(targetResource)) {
    const referencedSchemaIri = targetResource.dataPsmClass
      ? context.schemaIriByRootClassIri.get(targetResource.dataPsmClass)
      : undefined;
    const targetAggregateIri = referencedSchemaIri ?? targetResource.dataPsmSpecification;
    if (!targetAggregateIri) {
      addIssue(context, {
        code: DataspecerMetadataMappingIssueCode.MissingTargetAggregate,
        message: `Association "${association.iri ?? fieldPath}" class reference does not resolve to a structure schema.`,
        path: fieldPath,
      });
      return {};
    }
    return { targetAggregateIri };
  }

  const rootSchemaIri = targetResource.iri
    ? context.schemaIriByRootClassIri.get(targetResource.iri)
    : undefined;
  if (rootSchemaIri) {
    return { targetAggregateIri: rootSchemaIri };
  }

  if (targetResource.iri && visited.has(targetResource.iri)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.CircularStructure,
      message: `Association "${association.iri ?? fieldPath}" creates a circular inline structure.`,
      path: fieldPath,
    });
    return {};
  }

  return {
    fields: mapClassFields(
      targetResource,
      context,
      `${fieldPath}.target`,
      visitedClasses(targetResource, visited)
    ),
  };
}

function visitedClasses(psmClass: DataPsmClass, visited?: ReadonlySet<string>): Set<string> {
  const next = new Set(visited);
  if (psmClass.iri) {
    next.add(psmClass.iri);
  }
  return next;
}

function targetClassIriFrom(
  targetResource: DataPsmClass | DataPsmClassReference,
  targetEnd: SemanticModelRelationshipEnd | undefined,
  context: MappingContext
): string | undefined {
  const semanticClass =
    getSemanticClass(targetEnd?.concept, context) ??
    (DataPsmClass.is(targetResource)
      ? getSemanticClass(targetResource.dataPsmInterpretation, context)
      : undefined);
  return semanticClass ? publicClassIri(semanticClass) : publicAbsoluteIri(targetEnd?.concept);
}

function getSemanticClass(
  key: string | null | undefined,
  context: MappingContext
): SemanticModelClass | undefined {
  const entity = key ? context.semanticEntities.byKey.get(key) : undefined;
  return entity && isSemanticModelClass(entity) ? entity : undefined;
}

function getSemanticRelationship(
  key: string | null | undefined,
  context: MappingContext
): SemanticModelRelationship | undefined {
  const entity = key ? context.semanticEntities.byKey.get(key) : undefined;
  return entity && isSemanticModelRelationship(entity) ? entity : undefined;
}

function fieldPathFrom(
  resource: DataPsmAttribute | DataPsmAssociationEnd,
  relationship: SemanticModelRelationship | undefined
): string {
  return (
    resource.dataPsmTechnicalLabel ??
    labelFrom(resource.dataPsmHumanLabel) ??
    labelFrom(relationship?.ends[1]?.name) ??
    labelFrom(relationship?.name) ??
    localName(resource.iri ?? 'field')
  );
}

function fieldLabelFrom(
  resource: DataPsmAttribute | DataPsmAssociationEnd,
  relationship: SemanticModelRelationship | undefined,
  end: SemanticModelRelationshipEnd | undefined,
  fallback: string
): string {
  return (
    labelFrom(resource.dataPsmHumanLabel) ??
    labelFrom(end?.name) ??
    labelFrom(relationship?.name) ??
    resource.dataPsmTechnicalLabel ??
    fallback
  );
}

function cardinalityFlags(cardinality: Cardinality | null | undefined): {
  many?: boolean;
  required?: boolean;
} {
  if (!cardinality) {
    return {};
  }
  return {
    required: cardinality[0] > 0,
    many: cardinality[1] === null || cardinality[1] > 1,
  };
}

function isAssociationTargetResource(
  resource: StructureModelResource
): resource is DataPsmClass | DataPsmClassReference {
  return DataPsmClass.is(resource) || DataPsmClassReference.is(resource);
}

function entityKeys(entity: Entity): string[] {
  const keys: (string | null | undefined)[] = [entity.id];
  if (isSemanticModelClass(entity) || isSemanticModelRelationship(entity)) {
    keys.push(entity.iri);
  }
  if (isSemanticModelClass(entity)) {
    keys.push(...((entity as AggregatedSemanticModelClass).conceptIris ?? []));
  }
  return keys.filter(isString);
}

function publicClassIri(entity: SemanticModelClass): string | undefined {
  const dataspecerClass = entity as AggregatedSemanticModelClass;
  return (
    publicAbsoluteIri(entity.iri) ?? dataspecerClass.conceptIris?.find(isAbsoluteIri) ?? entity.id
  );
}

function relationshipPropertyIri(
  relationship: SemanticModelRelationship | undefined
): string | undefined {
  if (!relationship) {
    return undefined;
  }
  return [relationship.ends[1], relationship.ends[0], ...relationship.ends.slice(2)]
    .map((end) => (end ? publicRelationshipEndIri(end) : undefined))
    .find(isString);
}

function publicRelationshipEndIri(end: SemanticModelRelationshipEnd): string | undefined {
  const dataspecerEnd = end as AggregatedSemanticModelRelationshipEnd;
  return publicAbsoluteIri(end.iri) ?? dataspecerEnd.conceptIris?.find(isAbsoluteIri);
}

function publicAbsoluteIri(value: string | null | undefined): string | undefined {
  return isAbsoluteIri(value) ? value : undefined;
}

function isAbsoluteIri(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function labelFrom(value: LanguageString | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.length > 0 ? value : undefined;
  }
  return value.en ?? value.cs ?? Object.values(value).find((candidate) => candidate.length > 0);
}

function localName(iri: string): string {
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const separatorIndex = Math.max(hashIndex, slashIndex);
  return separatorIndex >= 0 ? iri.slice(separatorIndex + 1) : iri;
}

function resourcePath(resource: StructureModelResource): string | undefined {
  return resource.iri ? `resource(${resource.iri})` : undefined;
}

function addIssue(context: MappingContext, issue: DataspecerMetadataMappingIssue): void {
  context.issues.push(issue);
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
