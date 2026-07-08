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

import type { DataspecerMetadataProvider } from './dataspecer-metadata-provider.ts';
import type {
  DataspecerSemanticEntity,
  DataspecerSemanticModelClass,
  DataspecerSemanticModelRelationshipEnd,
  DataspecerSpecificationLoader,
  DataspecerSpecificationSource,
  DataspecerStructureResource,
} from './dataspecer-specification-source.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type DataspecerSpecificationMetadata,
  FieldKind,
} from './types.ts';

export interface DataspecerMetadataMappingIssue {
  code: DataspecerMetadataMappingIssueCode;
  message: string;
  path?: string;
}

export enum DataspecerMetadataMappingIssueCode {
  MissingStructureModels = 'missing_structure_models',
  MissingSchema = 'missing_schema',
  MissingSchemaIri = 'missing_schema_iri',
  MissingRootClass = 'missing_root_class',
  MissingClassInterpretation = 'missing_class_interpretation',
  MissingClassIri = 'missing_class_iri',
  MissingFieldResource = 'missing_field_resource',
  MissingFieldInterpretation = 'missing_field_interpretation',
  MissingAssociationTarget = 'missing_association_target',
  MissingTargetAggregate = 'missing_target_aggregate',
  UnsupportedFieldResource = 'unsupported_field_resource',
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
  resourcesByIri: Map<string, DataspecerStructureResource>;
  schemaIriByRootClassIri: Map<string, string>;
  issues: DataspecerMetadataMappingIssue[];
}

interface SemanticEntityIndex {
  byKey: Map<string, DataspecerSemanticEntity>;
}

export class DataspecerSpecificationMetadataProvider implements DataspecerMetadataProvider {
  constructor(private readonly loadSpecification: DataspecerSpecificationLoader) {}

  async getSpecificationMetadata(
    dataSpecificationIri: string
  ): Promise<DataspecerSpecificationMetadata> {
    const specification = await this.loadSpecification(dataSpecificationIri);
    return mapDataspecerSpecificationToMetadata(dataSpecificationIri, specification);
  }
}

export function mapDataspecerSpecificationToMetadata(
  dataSpecificationIri: string,
  specification: DataspecerSpecificationSource
): DataspecerSpecificationMetadata {
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

function buildMappingContext(specification: DataspecerSpecificationSource): MappingContext {
  const resourcesByIri = new Map<string, DataspecerStructureResource>();
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

function buildSemanticEntityIndex(entities: DataspecerSemanticEntity[]): SemanticEntityIndex {
  const byKey = new Map<string, DataspecerSemanticEntity>();

  for (const entity of entities) {
    for (const key of entityKeys(entity)) {
      byKey.set(key, entity);
    }
  }

  return { byKey };
}

function mapStructureModel(
  structureModel: DataspecerStructureResource[],
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
      fields: mapClassFields(rootClass, context, `${path}.root`),
    },
  ];
}

function mapClassFields(
  psmClass: DataPsmClass,
  context: MappingContext,
  path: string
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
      const field = mapAssociationField(part, context, fieldPath);
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
  path: string
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

  const targetAggregateIri = targetAggregateIriFrom(targetResource, context);
  if (!targetAggregateIri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingTargetAggregate,
      message: `Association "${association.iri ?? fieldPath}" target does not resolve to a structure schema.`,
      path,
    });
  }

  const targetClassIri = targetClassIriFrom(targetResource, targetEnd, context);

  return {
    path: fieldPath,
    label: fieldLabelFrom(association, relationship, targetEnd, fieldPath),
    kind: FieldKind.Association,
    ...(propertyIri ? { propertyIri } : {}),
    ...(targetAggregateIri ? { targetAggregateIri } : {}),
    ...(targetClassIri ? { targetClassIri } : {}),
    ...cardinalityFlags(cardinality),
  };
}

function targetAggregateIriFrom(
  targetResource: DataPsmClass | DataPsmClassReference,
  context: MappingContext
): string | undefined {
  if (DataPsmClassReference.is(targetResource)) {
    return targetResource.dataPsmSpecification ?? undefined;
  }
  return targetResource.iri ? context.schemaIriByRootClassIri.get(targetResource.iri) : undefined;
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
  resource: DataspecerStructureResource
): resource is DataPsmClass | DataPsmClassReference {
  return DataPsmClass.is(resource) || DataPsmClassReference.is(resource);
}

function entityKeys(entity: DataspecerSemanticEntity): string[] {
  const keys = [entity.id, entity.iri];
  if (isSemanticModelClass(entity)) {
    keys.push(...(entity.conceptIris ?? []));
  }
  return keys.filter(isString);
}

function publicClassIri(entity: SemanticModelClass): string | undefined {
  const dataspecerClass = entity as DataspecerSemanticModelClass;
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
  const dataspecerEnd = end as DataspecerSemanticModelRelationshipEnd;
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

function resourcePath(resource: DataspecerStructureResource): string | undefined {
  return resource.iri ? `resource(${resource.iri})` : undefined;
}

function addIssue(context: MappingContext, issue: DataspecerMetadataMappingIssue): void {
  context.issues.push(issue);
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
