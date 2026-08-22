import { sortBy } from 'es-toolkit';

import { DataPsmAssociationEnd } from '@dataspecer/core/data-psm/model/data-psm-association-end';
import { DataPsmAttribute } from '@dataspecer/core/data-psm/model/data-psm-attribute';
import { DataPsmClass } from '@dataspecer/core/data-psm/model/data-psm-class';
import { DataPsmClassReference } from '@dataspecer/core/data-psm/model/data-psm-class-reference';
import { DataPsmInclude } from '@dataspecer/core/data-psm/model/data-psm-include';
import { DataPsmOr } from '@dataspecer/core/data-psm/model/data-psm-or';
import { DataPsmSchema } from '@dataspecer/core/data-psm/model/data-psm-schema';
import {
  isSemanticModelClass,
  isSemanticModelRelationship,
  type LanguageString,
  type SemanticModelClass,
  type SemanticModelRelationship,
  type SemanticModelRelationshipEnd,
} from '@dataspecer/core-v2/semantic-model/concepts';
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from '@dataspecer/core-v2/semantic-model/profile/concepts';

import type { Entity } from '@dataspecer/core-v2/entity-model';

import type {
  SpecificationSourceLoader,
  SpecificationSource,
  StructureModelResource,
} from './specification-source.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  type DataspecerMetadataProvider,
  type InstanceIdentityPolicy,
  type SpecializationMetadata,
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
  MissingFieldIri = 'MISSING_FIELD_IRI',
  MissingAssociationTarget = 'MISSING_ASSOCIATION_TARGET',
  MissingTargetAggregate = 'MISSING_TARGET_AGGREGATE',
  MissingIncludeTarget = 'MISSING_INCLUDE_TARGET',
  MissingSpecializationChoice = 'MISSING_SPECIALIZATION_CHOICE',
  UnsupportedFieldResource = 'UNSUPPORTED_FIELD_RESOURCE',
  UnsupportedIncludeTarget = 'UNSUPPORTED_INCLUDE_TARGET',
  UnsupportedSpecializationChoice = 'UNSUPPORTED_SPECIALIZATION_CHOICE',
  UnsupportedStructureRoot = 'UNSUPPORTED_STRUCTURE_ROOT',
  ConflictingSpecializationFieldShape = 'CONFLICTING_SPECIALIZATION_FIELD_SHAPE',
  CircularStructure = 'CIRCULAR_STRUCTURE',
  CircularInclude = 'CIRCULAR_INCLUDE',
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

interface ProfileIriMetadata {
  conceptIris?: string[];
  profiling?: string[];
}

interface MappingContext {
  semanticEntities: Map<string, Entity>;
  resourcesByIri: Map<string, StructureModelResource>;
  schemaIriByRootClassIri: Map<string, string>;
  issues: DataspecerMetadataMappingIssue[];
}

interface MappedField {
  field: AggregateFieldMetadata;
  /**
   * Identifies the original field before class imports are expanded. The same imported declaration
   * may occur in several specialization choices and must appear only once in their union schema.
   */
  sourceFieldIri: string;
}

export class DataspecerSpecificationMetadataProvider implements DataspecerMetadataProvider {
  constructor(private readonly loadSpecification: SpecificationSourceLoader) {}

  async getSpecificationMetadata(dataSpecificationIri: string): Promise<SpecificationMetadata> {
    const specification = await this.loadSpecification(dataSpecificationIri);
    return mapDataspecerSpecificationToMetadata(dataSpecificationIri, specification);
  }
}

/** Maps every data structure and reports all discovered mapping problems together. */
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
      message: 'Specification contains no data structures.',
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

/** Indexes resources across data structures so references and Includes can cross structure arrays. */
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

function buildSemanticEntityIndex(entities: Entity[]): Map<string, Entity> {
  const byKey = new Map<string, Entity>();

  for (const entity of entities) {
    for (const key of entityKeys(entity)) {
      byKey.set(key, entity);
    }
  }

  return byKey;
}

/** Maps one data structure with a single class root to an aggregate. */
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
      message: `Data structure ${structureModelIndex} has no schema definition.`,
      path,
    });
    return [];
  }

  if (!schema.iri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingSchemaIri,
      message: `Data structure ${structureModelIndex} has no schema IRI.`,
      path,
    });
    return [];
  }

  const hasMultipleRoots = schema.dataPsmRoots.length > 1;
  const rootClassIri = schema.dataPsmRoots.length === 1 ? schema.dataPsmRoots[0] : undefined;
  const rootClass = rootClassIri ? context.resourcesByIri.get(rootClassIri) : undefined;

  if (hasMultipleRoots || (rootClass && DataPsmOr.is(rootClass))) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.UnsupportedStructureRoot,
      message:
        `Data structure "${schema.iri}" must have exactly one class root. ` +
        'Create a separate data structure for each root or specialization.',
      path: `${path}.dataPsmRoots`,
    });
    return [];
  }

  if (!rootClassIri || !rootClass || !DataPsmClass.is(rootClass)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingRootClass,
      message: `Data structure "${schema.iri}" does not have a root class that can be resolved.`,
      path: `${path}.dataPsmRoots[0]`,
    });
    return [];
  }

  const semanticClass = getSemanticClass(rootClass.dataPsmInterpretation, context);
  const classIri = semanticClass ? canonicalClassIri(semanticClass) : undefined;

  if (!rootClass.dataPsmInterpretation || !semanticClass) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingClassInterpretation,
      message:
        `Root class "${rootClassIri}" has no semantic interpretation. ` +
        'Check its interpretation in Dataspecer.',
      path: resourcePath(rootClass),
    });
  }

  if (!classIri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingClassIri,
      message:
        `Root class "${rootClassIri}" has no RDF vocabulary IRI. ` +
        'Check its interpretation and profiling in Dataspecer.',
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
      fields: toFieldMetadata(
        mapClassFields(rootClass, context, `${path}.root`, withClassOnPath(rootClass))
      ),
    },
  ];
}

/** Maps a class recursively and expands Includes at their position in the field list. */
function mapClassFields(
  psmClass: DataPsmClass,
  context: MappingContext,
  path: string,
  classPath: ReadonlySet<string>
): MappedField[] {
  return psmClass.dataPsmParts.flatMap((partIri, index) => {
    const part = context.resourcesByIri.get(partIri);
    const fieldPath = `${path}.dataPsmParts[${index}]`;

    if (!part) {
      addIssue(context, {
        code: DataspecerMetadataMappingIssueCode.MissingFieldResource,
        message: `Field "${partIri}" cannot be found in the data structure.`,
        path: fieldPath,
      });
      return [];
    }

    if (DataPsmAttribute.is(part)) {
      return [{ field: mapAttributeField(part, context, fieldPath), sourceFieldIri: partIri }];
    }

    if (DataPsmAssociationEnd.is(part)) {
      const field = mapAssociationField(part, context, fieldPath, classPath);
      return field ? [{ field, sourceFieldIri: partIri }] : [];
    }

    if (DataPsmInclude.is(part)) {
      return expandInclude(part, context, fieldPath, classPath);
    }

    // A specialization (Or) is supported as an association target, not as a class member.
    // Containers and external roots are outside the supported structure subset.
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.UnsupportedFieldResource,
      message: `Field "${partIri}" uses a structure construct that the app generator does not support.`,
      path: fieldPath,
    });
    return [];
  });
}

/** Replaces an Include with the fields declared by its target class. */
function expandInclude(
  include: DataPsmInclude,
  context: MappingContext,
  path: string,
  classPath: ReadonlySet<string>
): MappedField[] {
  const targetIri = include.dataPsmIncludes;
  const target = targetIri ? context.resourcesByIri.get(targetIri) : undefined;

  if (!targetIri || !target) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingIncludeTarget,
      message: `Include "${include.iri ?? path}" has a target that cannot be found.`,
      path,
    });
    return [];
  }

  if (!DataPsmClass.is(target)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.UnsupportedIncludeTarget,
      message: `Include "${include.iri ?? path}" must target a class directly.`,
      path,
    });
    return [];
  }

  if (classPath.has(targetIri)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.CircularInclude,
      message: `Include "${include.iri ?? path}" creates a circular Include chain.`,
      path,
    });
    return [];
  }

  return mapClassFields(target, context, `${path}.target`, withClassOnPath(target, classPath));
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
  const description = fieldDescriptionFrom(attribute, relationship, valueEnd);

  if (!attribute.dataPsmInterpretation || !relationship) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingFieldInterpretation,
      message:
        `Attribute "${attribute.iri ?? fieldPath}" has no semantic interpretation. ` +
        'Check its interpretation in Dataspecer.',
      path,
    });
  }

  if (relationship && !propertyIri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingFieldIri,
      message:
        `Attribute "${attribute.iri ?? fieldPath}" has no RDF vocabulary IRI. ` +
        'Check its interpretation and profiling in Dataspecer.',
      path,
    });
  }

  return {
    path: fieldPath,
    label: fieldLabelFrom(attribute, relationship, valueEnd, fieldPath),
    ...(description ? { description } : {}),
    kind: FieldKind.Primitive,
    ...(propertyIri ? { propertyIri } : {}),
    ...((attribute.dataPsmDatatype ?? valueEnd?.concept)
      ? { datatype: attribute.dataPsmDatatype ?? valueEnd?.concept ?? undefined }
      : {}),
    ...cardinalityFlags(cardinality),
  };
}

/** Maps an association's RDF predicate, cardinality, and structural target. */
function mapAssociationField(
  association: DataPsmAssociationEnd,
  context: MappingContext,
  path: string,
  classPath: ReadonlySet<string>
): AggregateFieldMetadata | null {
  const relationship = getSemanticRelationship(association.dataPsmInterpretation, context);
  const targetEnd = association.dataPsmIsReverse ? relationship?.ends[0] : relationship?.ends[1];
  const targetResource = association.dataPsmPart
    ? context.resourcesByIri.get(association.dataPsmPart)
    : undefined;
  const fieldPath = fieldPathFrom(association, relationship);
  const cardinality = association.dataPsmCardinality ?? targetEnd?.cardinality;
  const propertyIri = relationshipPropertyIri(relationship);
  const description = fieldDescriptionFrom(association, relationship, targetEnd);

  if (!association.dataPsmInterpretation || !relationship) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingFieldInterpretation,
      message:
        `Association "${association.iri ?? fieldPath}" has no semantic interpretation. ` +
        'Check its interpretation in Dataspecer.',
      path,
    });
  }

  if (relationship && !propertyIri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingFieldIri,
      message:
        `Association "${association.iri ?? fieldPath}" has no RDF vocabulary IRI. ` +
        'Check its interpretation and profiling in Dataspecer.',
      path,
    });
  }

  if (!targetResource || !isAssociationTargetResource(targetResource)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingAssociationTarget,
      message:
        `Association "${association.iri ?? fieldPath}" must target a class, ` +
        'class reference, or specialization (Or).',
      path,
    });
    return null;
  }

  const targetClassIri = targetClassIriFrom(targetResource, targetEnd, context);
  const target = resolveAssociationTarget(
    association,
    targetResource,
    fieldPath,
    context,
    classPath
  );

  if (!targetClassIri) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingClassIri,
      message:
        `Association "${association.iri ?? fieldPath}" target has no RDF vocabulary IRI. ` +
        'Check its interpretation and profiling in Dataspecer.',
      path,
    });
  }

  return {
    path: fieldPath,
    label: fieldLabelFrom(association, relationship, targetEnd, fieldPath),
    ...(description ? { description } : {}),
    kind: FieldKind.Association,
    ...(propertyIri ? { propertyIri } : {}),
    ...(target.targetAggregateIri ? { targetAggregateIri: target.targetAggregateIri } : {}),
    ...(targetClassIri ? { targetClassIri } : {}),
    ...(target.targetIdentityPolicy ? { targetIdentityPolicy: target.targetIdentityPolicy } : {}),
    ...(target.specializations ? { specializations: target.specializations } : {}),
    ...(association.dataPsmIsReverse ? { isReverse: true } : {}),
    ...cardinalityFlags(cardinality),
    ...(target.fields ? { fields: target.fields } : {}),
  };
}

interface ResolvedAssociationTarget {
  targetAggregateIri?: string;
  fields?: AggregateFieldMetadata[];
  targetIdentityPolicy?: InstanceIdentityPolicy;
  specializations?: SpecializationMetadata[];
}

/**
 * An association target is either a reference to another aggregate (a class reference or the root
 * class of another structure model) or a class defined inline within the current aggregate's
 * structure tree. Inline classes contribute nested fields. References contribute a target
 * aggregate IRI.
 */
function resolveAssociationTarget(
  association: DataPsmAssociationEnd,
  targetResource: DataPsmClass | DataPsmClassReference | DataPsmOr,
  fieldPath: string,
  context: MappingContext,
  classPath: ReadonlySet<string>
): ResolvedAssociationTarget {
  if (DataPsmOr.is(targetResource)) {
    return resolveSpecializationTarget(targetResource, fieldPath, context, classPath);
  }

  if (DataPsmClassReference.is(targetResource)) {
    const referencedSchemaIri = targetResource.dataPsmClass
      ? context.schemaIriByRootClassIri.get(targetResource.dataPsmClass)
      : undefined;
    const targetAggregateIri = referencedSchemaIri ?? targetResource.dataPsmSpecification;
    if (!targetAggregateIri) {
      addIssue(context, {
        code: DataspecerMetadataMappingIssueCode.MissingTargetAggregate,
        message:
          `Association "${association.iri ?? fieldPath}" class reference does not resolve ` +
          'to a data structure.',
        path: fieldPath,
      });
      return {};
    }
    return {
      targetAggregateIri,
      targetIdentityPolicy: classReferenceIdentityPolicy(targetResource, context),
    };
  }

  const rootSchemaIri = targetResource.iri
    ? context.schemaIriByRootClassIri.get(targetResource.iri)
    : undefined;
  if (rootSchemaIri) {
    return {
      targetAggregateIri: rootSchemaIri,
      targetIdentityPolicy: identityPolicyFrom(targetResource),
    };
  }

  if (targetResource.iri && classPath.has(targetResource.iri)) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.CircularStructure,
      message: `Association "${association.iri ?? fieldPath}" creates a circular inline structure.`,
      path: fieldPath,
    });
    return {};
  }

  return {
    fields: toFieldMetadata(
      mapClassFields(
        targetResource,
        context,
        `${fieldPath}.target`,
        withClassOnPath(targetResource, classPath)
      )
    ),
    targetIdentityPolicy: identityPolicyFrom(targetResource),
  };
}

interface MappedSpecialization {
  specializationIri: string;
  label: string;
  classIri: string;
  identityPolicy: InstanceIdentityPolicy;
  fields: MappedField[];
}

/**
 * Maps specialization choices into the union field tree used by their shared LDKit read schema.
 * Each choice retains its field paths so forms and writes can use only the selected specialization.
 */
function resolveSpecializationTarget(
  specializationOr: DataPsmOr,
  fieldPath: string,
  context: MappingContext,
  classPath: ReadonlySet<string>
): ResolvedAssociationTarget {
  if (specializationOr.dataPsmChoices.length === 0) {
    addIssue(context, {
      code: DataspecerMetadataMappingIssueCode.MissingSpecializationChoice,
      message: `Specialization (Or) "${specializationOr.iri ?? fieldPath}" has no choices.`,
      path: fieldPath,
    });
    return {};
  }

  const seenChoices = new Set<string>();
  const specializations = specializationOr.dataPsmChoices.flatMap(
    (choiceIri, index): MappedSpecialization[] => {
      const choicePath = `${fieldPath}.target.dataPsmChoices[${index}]`;
      const choice = context.resourcesByIri.get(choiceIri);

      if (!choice) {
        addIssue(context, {
          code: DataspecerMetadataMappingIssueCode.MissingSpecializationChoice,
          message:
            `Choice "${choiceIri}" in specialization (Or) ` +
            `"${specializationOr.iri ?? fieldPath}" cannot be found.`,
          path: choicePath,
        });
        return [];
      }

      if (!DataPsmClass.is(choice)) {
        addIssue(context, {
          code: DataspecerMetadataMappingIssueCode.UnsupportedSpecializationChoice,
          message:
            `Choice "${choiceIri}" in specialization (Or) ` +
            `"${specializationOr.iri ?? fieldPath}" must be a class.`,
          path: choicePath,
        });
        return [];
      }

      if (seenChoices.has(choiceIri)) {
        addIssue(context, {
          code: DataspecerMetadataMappingIssueCode.UnsupportedSpecializationChoice,
          message:
            `Specialization (Or) "${specializationOr.iri ?? fieldPath}" contains ` +
            `the class choice "${choiceIri}" more than once.`,
          path: choicePath,
        });
        return [];
      }
      seenChoices.add(choiceIri);

      const semanticClass = getSemanticClass(choice.dataPsmInterpretation, context);
      const classIri = semanticClass ? canonicalClassIri(semanticClass) : undefined;
      if (!choice.dataPsmInterpretation || !semanticClass) {
        addIssue(context, {
          code: DataspecerMetadataMappingIssueCode.MissingClassInterpretation,
          message:
            `Choice "${choiceIri}" in specialization (Or) ` +
            `"${specializationOr.iri ?? fieldPath}" has no semantic interpretation. ` +
            'Check its interpretation in Dataspecer.',
          path: choicePath,
        });
      }
      if (!classIri) {
        addIssue(context, {
          code: DataspecerMetadataMappingIssueCode.MissingClassIri,
          message:
            `Choice "${choiceIri}" in specialization (Or) ` +
            `"${specializationOr.iri ?? fieldPath}" has no RDF vocabulary IRI. ` +
            'Check its interpretation and profiling in Dataspecer.',
          path: choicePath,
        });
      }

      return [
        {
          specializationIri: choiceIri,
          label:
            labelFrom(choice.dataPsmHumanLabel) ??
            choice.dataPsmTechnicalLabel ??
            labelFrom(semanticClass?.name) ??
            localName(choiceIri),
          classIri: classIri ?? '',
          identityPolicy: identityPolicyFrom(choice),
          fields: mapClassFields(
            choice,
            context,
            `${choicePath}.target`,
            withClassOnPath(choice, classPath)
          ),
        },
      ];
    }
  );

  reportConflictingSpecializationFieldShapes(specializations, fieldPath, context);

  const unionByIdentityAndShape = new Map<string, MappedField>();

  specializations.forEach((specialization) => {
    for (const mappedField of specialization.fields) {
      const key = `${mappedField.sourceFieldIri}\u0000${fieldCompatibilityKey(mappedField.field)}`;
      if (!unionByIdentityAndShape.has(key)) {
        unionByIdentityAndShape.set(key, mappedField);
      }
    }
  });

  return {
    fields: [...unionByIdentityAndShape.values()].map(({ field }) => field),
    specializations: specializations.map(({ fields, ...specialization }) => ({
      ...specialization,
      fieldPaths: [...new Set(fields.map(({ field }) => field.path))],
    })),
  };
}

/**
 * Rejects incompatible definitions of one RDF predicate across specialization choices. All choices
 * share one LDKit read schema, which cannot give a predicate different datatypes, cardinalities,
 * directions, targets, or nested shapes at the same time.
 */
function reportConflictingSpecializationFieldShapes(
  specializations: MappedSpecialization[],
  path: string,
  context: MappingContext
): void {
  const firstByPredicate = new Map<string, { specializationIndex: number; shape: string }>();
  const reportedPredicates = new Set<string>();

  specializations.forEach((specialization, specializationIndex) => {
    for (const { field } of specialization.fields) {
      if (!field.propertyIri) {
        continue;
      }
      const shape = fieldCompatibilityKey(field);
      const first = firstByPredicate.get(field.propertyIri);
      if (!first) {
        firstByPredicate.set(field.propertyIri, { specializationIndex, shape });
        continue;
      }
      if (
        first.specializationIndex !== specializationIndex &&
        first.shape !== shape &&
        !reportedPredicates.has(field.propertyIri)
      ) {
        reportedPredicates.add(field.propertyIri);
        const firstSpecialization = specializations[first.specializationIndex];
        addIssue(context, {
          code: DataspecerMetadataMappingIssueCode.ConflictingSpecializationFieldShape,
          message:
            `Specializations "${firstSpecialization.label}" and "${specialization.label}" ` +
            `define predicate "${field.propertyIri}" incompatibly. Align their datatype, ` +
            'cardinality, direction, and target, or use different predicates.',
          path,
        });
      }
    }
  });
}

/**
 * Describes the parts of a field that affect its LDKit schema. Display text and validation-only
 * identity policies do not affect whether two predicate definitions can share the read schema.
 */
function fieldCompatibilityKey(field: AggregateFieldMetadata): string {
  return JSON.stringify({
    kind: field.kind,
    propertyIri: field.propertyIri ?? null,
    datatype: field.datatype ?? null,
    targetAggregateIri: field.targetAggregateIri ?? null,
    targetClassIri: field.targetClassIri ?? null,
    specializations:
      field.specializations?.map(
        ({ identityPolicy: _identityPolicy, ...specialization }) => specialization
      ) ?? null,
    isReverse: field.isReverse ?? false,
    many: field.many ?? false,
    required: field.required ?? false,
    minCount: field.minCount ?? 0,
    maxCount: field.maxCount ?? null,
    fields: field.fields?.map(fieldCompatibilityKey) ?? null,
  });
}

function toFieldMetadata(fields: MappedField[]): AggregateFieldMetadata[] {
  return fields.map(({ field }) => field);
}

/** Adds a class to the current recursive path used by association and Include cycle checks. */
function withClassOnPath(psmClass: DataPsmClass, classPath?: ReadonlySet<string>): Set<string> {
  const next = new Set(classPath);
  if (psmClass.iri) {
    next.add(psmClass.iri);
  }
  return next;
}

function identityPolicyFrom(psmClass: DataPsmClass): InstanceIdentityPolicy {
  return psmClass.instancesHaveIdentity ?? 'ALWAYS';
}

function classReferenceIdentityPolicy(
  reference: DataPsmClassReference,
  context: MappingContext
): InstanceIdentityPolicy {
  const target = reference.dataPsmClass
    ? context.resourcesByIri.get(reference.dataPsmClass)
    : undefined;
  return target && DataPsmClass.is(target) ? identityPolicyFrom(target) : 'ALWAYS';
}

function targetClassIriFrom(
  targetResource: DataPsmClass | DataPsmClassReference | DataPsmOr,
  targetEnd: SemanticModelRelationshipEnd | undefined,
  context: MappingContext
): string | undefined {
  const semanticClass =
    getSemanticClass(targetEnd?.concept, context) ??
    (DataPsmClass.is(targetResource)
      ? getSemanticClass(targetResource.dataPsmInterpretation, context)
      : undefined);
  return semanticClass ? canonicalClassIri(semanticClass) : absoluteIri(targetEnd?.concept);
}

function getSemanticClass(
  key: string | null | undefined,
  context: MappingContext
): SemanticModelClass | undefined {
  const entity = key ? context.semanticEntities.get(key) : undefined;
  return entity && isSemanticModelClass(entity) ? entity : undefined;
}

function getSemanticRelationship(
  key: string | null | undefined,
  context: MappingContext
): SemanticModelRelationship | undefined {
  const entity = key ? context.semanticEntities.get(key) : undefined;
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

function fieldDescriptionFrom(
  resource: DataPsmAttribute | DataPsmAssociationEnd,
  relationship: SemanticModelRelationship | undefined,
  end: SemanticModelRelationshipEnd | undefined
): string | undefined {
  return (
    labelFrom(resource.dataPsmHumanDescription) ??
    labelFrom(end?.description) ??
    labelFrom(relationship?.description)
  );
}

function cardinalityFlags(cardinality: Cardinality | null | undefined): {
  many: boolean;
  required: boolean;
  minCount: number;
  maxCount: number | null;
} {
  if (!cardinality) {
    // treat missing cardinality as 0..*
    return { required: false, many: true, minCount: 0, maxCount: null };
  }
  return {
    required: cardinality[0] > 0,
    many: cardinality[1] === null || cardinality[1] > 1,
    minCount: cardinality[0],
    maxCount: cardinality[1],
  };
}

function isAssociationTargetResource(
  resource: StructureModelResource
): resource is DataPsmClass | DataPsmClassReference | DataPsmOr {
  return DataPsmClass.is(resource) || DataPsmClassReference.is(resource) || DataPsmOr.is(resource);
}

function entityKeys(entity: Entity): string[] {
  // index technical, declared and canonical IRIs so every reference resolves to the same entity
  const keys: (string | null | undefined)[] = [entity.id];
  if (isSemanticModelClass(entity) || isSemanticModelRelationship(entity)) {
    keys.push(entity.iri);
  }
  if (isSemanticModelClass(entity)) {
    keys.push(...((entity as ProfileIriMetadata).conceptIris ?? []));
  }
  return keys.filter(isString);
}

/** Returns the external RDF class IRI, never a local Dataspecer profile identifier. */
function canonicalClassIri(entity: SemanticModelClass): string | undefined {
  const profile = entity as ProfileIriMetadata;
  if (isSemanticModelClassProfile(entity) || profile.profiling?.length) {
    return singleAbsoluteIri(profile.conceptIris);
  }
  return absoluteIri(entity.iri) ?? absoluteIri(entity.id);
}

function relationshipPropertyIri(
  relationship: SemanticModelRelationship | undefined
): string | undefined {
  if (!relationship) {
    return undefined;
  }
  const relationshipIsProfile = isSemanticModelRelationshipProfile(relationship);
  return [relationship.ends[1], relationship.ends[0], ...relationship.ends.slice(2)]
    .map((end) => (end ? canonicalRelationshipEndIri(end, relationshipIsProfile) : undefined))
    .find(isString);
}

function canonicalRelationshipEndIri(
  end: SemanticModelRelationshipEnd,
  relationshipIsProfile: boolean
): string | undefined {
  const profile = end as ProfileIriMetadata;
  if (relationshipIsProfile || profile.profiling?.length) {
    return singleAbsoluteIri(profile.conceptIris);
  }
  return absoluteIri(end.iri);
}

function singleAbsoluteIri(values: string[] | undefined): string | undefined {
  const candidates = [...new Set(values ?? [])];
  return candidates.length === 1 && isAbsoluteIri(candidates[0]) ? candidates[0] : undefined;
}

function absoluteIri(value: string | null | undefined): string | undefined {
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
  return [value.en, value.cs, ...Object.values(value)].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0
  );
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
