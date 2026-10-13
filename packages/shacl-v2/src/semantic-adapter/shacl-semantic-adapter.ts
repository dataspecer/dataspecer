import { ProfileModel } from "@dataspecer/profile-model";
import { SemanticModel } from "@dataspecer/semantic-model";
import { semanticModelToLightweightOwl } from "@dataspecer/lightweight-owl";
import {
  createDataSpecificationVocabulary,
} from "@dataspecer/data-specification-vocabulary/semantic-model";
import {
  isComplexType,
  isPrimitiveType,
} from "@dataspecer/core-v2/semantic-model/datatypes";
import { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";

import {
  createStructureModelForProfile,
  EntityContainer,
  StructureClass,
  StructureControlledVocabularyAssignment,
  StructureProperty,
} from "./structure-model/index.ts";
import {
  createShaclPropertyShape,
  ShaclModel,
  ShaclNodeKind,
  ShaclNodeShape,
  ShaclPropertyShape,
  ShaclSeverity,
} from "../shacl-model.ts";
import {
  createSemicShaclStylePolicy,
  SemanticModelsToShaclPolicy,
} from "./shacl-semantic-policy.ts";
import {
  SemanticModelsToShaclConfiguration,
} from "./shacl-semantic-configuration.ts";
import { SKOS } from "../vocabulary.ts";
import {
  applyNoClassConstraint,
  filterLanguageStrings,
  splitConstraints,
} from "../shacl-transformer.ts";

interface SemanticModelsToShaclConfigurationOptions {

  baseIri: string;

  /**
   * Default prefixes to use in addition to the built-in ones.
   */
  defaultPrefixes?: Record<string, string>;

}

/**
 * Create and return SHACL for given semantic profile model.
 *
 * {@link topProfileModel} must be part of {@link profileModels}.
 */
export function semanticModelsToShacl(
  semanticModels: SemanticModel[],
  profileModels: ProfileModel[],
  topProfileModel: ProfileModel,
  configuration: SemanticModelsToShaclConfiguration,
  options: SemanticModelsToShaclConfigurationOptions,
  controlledVocabularies: SemanticModel[] = [],
): ShaclModel {
  const policy = createPolicy(configuration, options);

  if (!profileModels.map(model => model.getId()).includes(topProfileModel.getId())) {
    console.error("The top profile should be among all profiles.");
  }

  // Prepare Lightweight OWL models.
  const owl = semanticModelToLightweightOwl(
    [], semanticModels, { baseIri: "", idDefinedBy: "" });

  // Prepare Data Specification Vocabulary (DSV).
  // We need a DSV for each model, as we need to be able to see
  // the full hierarchy.

  const dsv = createDataSpecificationVocabulary(
    {
      semantics: semanticModels,
      profiles: profileModels,
      controlledVocabularies,
    },
    // Here we need to pass all models as we need the full hierarchy.
    // Without it we do not have the connection to OWL classes.
    // We know that the top model is part of the profile models.
    profileModels,
    { iri: "http://example.com/" });

  // This is a workaround for
  // https://github.com/dataspecer/dataspecer/issues/1493.
  // To properly solve the issue we need to be able to produce DSV at
  // different levels and then aggregate them or mark from which model
  // they are.
  const topDsv = createDataSpecificationVocabulary(
    {
      semantics: semanticModels,
      profiles: profileModels,
      controlledVocabularies,
    },
    [topProfileModel],
    { iri: "http://example.com/" });
  const topClassesByIri = topDsv.classProfiles.map(item => item.iri);

  const controlledVocabularyContainers: EntityContainer[] =
    controlledVocabularies.map(item => ({
      baseIri: item.getBaseIri(),
      entities: Object.values(item.getEntities()),
    }));

  const structure = createStructureModelForProfile(
    owl, dsv, controlledVocabularyContainers);
  const classMap: Record<string, StructureClass> = {};
  structure.classes.forEach(item => classMap[item.iri] = item);

  const shapeMap: Map<StructureClass, ShaclNodeShape[]> = new Map();

  // For each entity we build a property shapes.
  for (const entity of structure.classes) {
    if (!topClassesByIri.includes(entity.iri)) {
      continue;
    }
    // First we build a list of all properties for the given entity
    // as templates. The reason is we do not have a complete information
    // about them yet.
    const propertyShapesTemplates = buildPropertiesShapeTemplates(
      classMap, entity.properties, policy);

    // We need shape for every type.
    const shapes = entity.rdfTypes.map(type => buildShaclNodeShape(
      entity, type, propertyShapesTemplates, policy));

    shapeMap.set(entity, shapes);
  }

  // As the next step we need to deal with specializations.
  // For C dsv:specializes P, we need to run all validations from P on C.
  const parentMap = buildFullParentMap(classMap);
  const members: ShaclNodeShape[] = [];
  for (const [entity, shapes] of shapeMap.entries()) {
    const parents = parentMap[entity.iri];
    // Now we need to all properties from each parent to each shape,
    // we do not do this in-place to be order independent.
    for (const shape of shapes) {
      const properties = [...new Set([
        ...shape.propertyShapes,
        // Add properties from parents.
        ...parents.map(iri => classMap[iri])
          .map(item => shapeMap.get(item) ?? [])
          .flat()
          .map(shape => shape.propertyShapes)
          .flat(),
      ])];
      members.push({
        ...shape,
        propertyShapes: properties,
      })
    }

    // Controlled vocabulary constraints are emitted as separate node
    // shapes (one per effective assignment), not merged into the primary shape above
    const controlledVocabularyAssignments =
      buildEffectiveControlledVocabularyAssignments(
        entity, parents, classMap);
    for (const type of entity.rdfTypes) {
      for (const assignment of controlledVocabularyAssignments) {
        const controlledVocabularyShape = buildControlledVocabularyNodeShape(
          entity, type, assignment, policy, configuration);
        if (controlledVocabularyShape !== null) {
          members.push(controlledVocabularyShape);
        }
      }
    }
  }

  return transformShaclModel({
    iri: policy.shaclModelIri(),
    members,
  }, configuration);
}

function createPolicy(
  _configuration: SemanticModelsToShaclConfiguration,
  options: SemanticModelsToShaclConfigurationOptions,
): SemanticModelsToShaclPolicy {
  // We support only SEMIC policy as of now.
  return createSemicShaclStylePolicy(
    options.baseIri, options.defaultPrefixes ?? {});
}

type ShaclPropertyShapeTemplate = Omit<ShaclPropertyShape, "iri">;

function buildPropertiesShapeTemplates(
  classMap: Record<string, StructureClass>,
  properties: StructureProperty[],
  policy: SemanticModelsToShaclPolicy,
): ShaclPropertyShapeTemplate[] {
  const result: ShaclPropertyShapeTemplate[] = [];
  for (const property of properties) {
    // We split the types.
    const { primitives, complex } = splitRangeTypes(property);
    // Each property can be expressed using multiple predicates.
    for (const predicate of property.rdfPredicates) {
      result.push(...buildPropertyShapeTemplateForPrimitiveTypes(
        property, predicate, primitives, policy));
      result.push(...buildPropertyShapeForTemplateComplexTypes(
        classMap, property, predicate, complex, policy));
    }
  }
  return result;
}

function splitRangeTypes(
  property: StructureProperty,
): { primitives: string[], complex: string[], } {
  const primitives: string[] = [];
  const complex: string[] = [];
  property.range.forEach(type => {
    const isPrimitive = isPrimitiveType(type);
    const isComplex = isComplexType(type);
    if (isPrimitive && !isComplex) {
      primitives.push(type);
    } else if (!isPrimitive && isComplex) {
      complex.push(type);
    } else {
      // Can be both or neither, it should not happen.
      console.warn("Unexpected type.",
        { isPrimitive, isComplex, property, range: type });
    }
  });
  return { primitives, complex };
}

function buildPropertyShapeTemplateForPrimitiveTypes(
  property: StructureProperty,
  predicate: string,
  ranges: string[],
  policy: SemanticModelsToShaclPolicy,
): ShaclPropertyShapeTemplate[] {
  if (ranges.length === 0) {
    return [];
  }
  // We filtered out all types, we just create a shape with no data type.
  // https://github.com/dataspecer/dataspecer/issues/1295
  const filteredRanges = policy.literalTypeFilter(ranges);
  if (filteredRanges.length === 0) {
    return [
      buildPropertyShapeTemplateForPrimitiveType(property, predicate, null),
    ];
  } else {
    return filteredRanges.map(type => policy.literalTypeMap(type))
      .map(type => buildPropertyShapeTemplateForPrimitiveType(
        property, predicate, type));
  }
}

function buildPropertyShapeTemplateForPrimitiveType(
  property: StructureProperty,
  predicate: string,
  range: string | null,
): ShaclPropertyShapeTemplate {
  return {
    seeAlso: property.iri,
    description: property.usageNote,
    name: property.name,
    nodeKind: ShaclNodeKind.Literal,
    path: predicate,
    minCount: property.rangeCardinality.min,
    maxCount: property.rangeCardinality.max,
    datatype: range,
    class: null,
    hasValue: null,
    severity: null,
  };
}

function buildPropertyShapeForTemplateComplexTypes(
  classMap: Record<string, StructureClass>,
  property: StructureProperty,
  predicate: string,
  ranges: string[],
  policy: SemanticModelsToShaclPolicy,
): ShaclPropertyShapeTemplate[] {
  if (ranges.length === 0) {
    return [];
  }
  // We need to translate the ranges to types.
  const types: string[] = [];
  for (const range of ranges) {
    types.push(...(classMap[range]?.rdfTypes ?? [range]));
  }
  // We filtered out all types, we just create a shape with no data type.
  // https://github.com/dataspecer/dataspecer/issues/1295
  const filteredTypes = policy.nodeTypeFilter(types);
  if (filteredTypes.length === 0) {
    return [
      buildPropertyShapeForTemplateComplexType(property, predicate, null),
    ];
  } else {
    return filteredTypes.map(type =>
      buildPropertyShapeForTemplateComplexType(property, predicate, type));
  }
}

function buildPropertyShapeForTemplateComplexType(
  property: StructureProperty,
  predicate: string,
  range: string | null,
): ShaclPropertyShapeTemplate {
  return {
    seeAlso: property.iri,
    description: property.usageNote,
    name: property.name,
    nodeKind: ShaclNodeKind.BlankNodeOrIRI,
    path: predicate,
    minCount: property.rangeCardinality.min,
    maxCount: property.rangeCardinality.max,
    datatype: null,
    class: range,
    hasValue: null,
    severity: null,
  };
}

function buildShaclNodeShape(
  entity: StructureClass,
  type: string,
  properties: ShaclPropertyShapeTemplate[],
  policy: SemanticModelsToShaclPolicy,
): ShaclNodeShape {
  return {
    iri: policy.shaclNodeShape(entity.iri, type),
    seeAlso: entity.iri,
    targetClass: type,
    closed: false,
    propertyShapes: properties.map(property => ({
      iri: policy.shaclPredicateShape(entity.iri, type, property),
      seeAlso: property.seeAlso,
      description: property.description,
      name: property.name,
      nodeKind: property.nodeKind,
      path: property.path,
      minCount: property.minCount,
      maxCount: property.maxCount,
      datatype: property.datatype,
      class: property.class,
      hasValue: property.hasValue,
      severity: property.severity,
    } satisfies ShaclPropertyShape)),
    pattern: null,
    severity: null,
  }
}

/**
 * Resolves the controlled vocabulary assignments that should apply to
 * {@link entity}: its own assignments plus every ancestor's own
 * assignments, with any assignment excluded whose IRI is targeted by
 * a {@link StructureControlledVocabularyAssignment.replaces} present
 * anywhere in that combined set.
 */
function buildEffectiveControlledVocabularyAssignments(
  entity: StructureClass,
  parents: string[],
  classMap: Record<string, StructureClass>,
): StructureControlledVocabularyAssignment[] {
  const candidates = [
    ...entity.controlledVocabularyAssignments,
    ...parents
      .map(iri => classMap[iri])
      .flatMap(item => item?.controlledVocabularyAssignments ?? []),
  ];
  const replacedIris = new Set(
    candidates
      .map(item => item.replaces)
      .filter((iri): iri is string => iri !== null));
  return candidates.filter(item => !replacedIris.has(item.iri));
}

/**
 * Maps DCAT-AP's controlled vocabulary usage expectation to a SHACL
 * severity: "must" closes the value space (a violation), while
 * "at-least-one"/"recommended"/"may" are all reported as warnings.
 *
 * @see https://github.com/SEMICeu/DCAT-AP/blob/master/releases/3.0.0/dcat-ap_final.md
 */
function qualifierToSeverity(qualifier: Qualifier | null): ShaclSeverity | null {
  switch (qualifier) {
    case "must":
      return ShaclSeverity.Violation;
    case "at-least-one":
    case "recommended":
    case "may":
      return ShaclSeverity.Warning;
    case null:
      return null;
  }
}

/**
 * Builds a node shape validating a single controlled vocabulary
 * assignment, sharing {@link entity}'s primary shape's target class.
 * When enabled by the {@link configuration}, the IRI of the value must
 * match the pattern of the vocabulary, and when the vocabulary is
 * SKOS-based, the value must be in its concept scheme.
 * Both are reported with the severity of the assignment.
 * Returns `null` when there is nothing to validate, that is when no
 * enabled check applies to the vocabulary: it has neither a pattern nor
 * a scheme (see {@link StructureControlledVocabularyAssignment.pattern}
 * and {@link StructureControlledVocabularyAssignment.schemeIri}), for
 * example when it could not be resolved.
 */
function buildControlledVocabularyNodeShape(
  entity: StructureClass,
  type: string,
  assignment: StructureControlledVocabularyAssignment,
  policy: SemanticModelsToShaclPolicy,
  configuration: SemanticModelsToShaclConfiguration,
): ShaclNodeShape | null {
  // The checks are explicit comparisons rather than truthiness tests for
  // backwards compatibility. A configuration stored before these options
  // existed does not have them, in which case only the pattern is checked.
  const checkPattern = configuration.controlledVocabularyPattern !== false;
  const checkScheme = configuration.controlledVocabularyScheme === true;
  const pattern = checkPattern ? assignment.pattern : null;
  const schemeIri = checkScheme ? assignment.schemeIri : null;
  if (pattern === null && schemeIri === null) {
    return null;
  }
  const severity = qualifierToSeverity(assignment.usageExpectation);
  const propertyShapes: ShaclPropertyShape[] = [];
  if (schemeIri !== null) {
    // Severity of a node shape does not apply to its property shapes.
    propertyShapes.push(createShaclPropertyShape({
      iri: policy.shaclControlledVocabularySchemeShape(
        entity.iri, type, assignment.controlledVocabularyIri),
      seeAlso: entity.iri,
      path: SKOS.inScheme.value,
      hasValue: schemeIri,
      severity,
    }));
  }
  return {
    iri: policy.shaclControlledVocabularyShape(
      entity.iri, type, assignment.controlledVocabularyIri),
    seeAlso: entity.iri,
    targetClass: type,
    closed: false,
    propertyShapes,
    pattern,
    severity,
  };
}

function buildFullParentMap(
  classMap: Record<string, StructureClass>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const item of Object.values(classMap)) {
    const visited = new Set<string>();
    const stack = [...item.specializationOf];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (!visited.has(current)) {
        visited.add(current);
        const parent = classMap[current];
        if (parent) {
          stack.push(...parent.specializationOf);
        }
      }
    }
    result[item.iri] = [...visited];
  }
  return result;
}

function transformShaclModel(
  model: ShaclModel,
  configuration: SemanticModelsToShaclConfiguration,
): ShaclModel {
  let result = model;

  if (configuration.languages.length > 0) {
    result = filterLanguageStrings(result, configuration.languages);
  }

  if (configuration.noClassConstraints === true) {
    result = applyNoClassConstraint(result);
  }

  if (configuration.splitPropertyShapesByConstraints === true) {
    result = splitConstraints(result);
  }

  return result;
}
