import { ProfileModel } from "@dataspecer/profile-model";
import { SemanticModel } from "@dataspecer/semantic-model";
import {
  semanticModelToLightweightOwl,
} from "@dataspecer/lightweight-owl";
import {
  createDataSpecificationVocabulary,
} from "@dataspecer/data-specification-vocabulary";
import {
  isComplexType,
  isPrimitiveType,
} from "@dataspecer/core-v2/semantic-model/datatypes";

import {
  createStructureModelForProfile,
  StructureClass,
  StructureProperty,
} from "./structure-model/index.ts";
import {
  ShaclModel,
  ShaclNodeKind,
  ShaclNodeShape,
  ShaclPropertyShape,
} from "./shacl-model.ts";

export interface ShaclForProfilePolicy {

  /**
   * @returns String to be used for the root of the SHACL shape.
   */
  shaclModelIri: () => string;

  /**
   * @param entity IRI of represented profile.
   * @param type IRI of represented RDF type.
   * @returns IRI for a node shape.
   */
  shaclNodeShape: (profile: string, type: string) => string;

  /**
   * @returns IRI for a predicate shape.
   */
  shaclPredicateShape: (profile: string, type: string, predicate: {
    path: string,
    datatype: string | null,
    class: string | null,
    minCount: number | null,
    maxCount: number | null,
  }) => string;

  nodeTypeFilter: (types: string[]) => string[];

  literalTypeFilter: (types: string[]) => string[];

  prefixes: () => { [prefix: string]: string };

}

interface SemicShaclStylePolicyOptions {
  /**
   * Default prefixes to use in addition to the built-in ones.
   */
  defaultPrefixes?: Record<string, string>;
}

/**
 * Node shape IRI is created as: {base iri}/{prefixed type iri}Shape
 * Predicate shape IRI is created as: {node shape iri}/{property hash}
 *
 * @see https://github.com/SEMICeu/DCAT-AP/blob/master/releases/3.0.0/shacl/dcat-ap-SHACL.ttl
 */
export function createSemicShaclStylePolicy(baseIri: string, options: SemicShaclStylePolicyOptions = {}): ShaclForProfilePolicy {

  // If there is "#" in the IRI we are in fragment section,
  // we do not need to encode : , ale we need to.
  const isFragment = baseIri.includes("#");

  const prefixes: Record<string, string> = {
    "http://www.w3.org/ns/dcat#": "dcat",
    "http://purl.org/dc/terms/": "dcterms",
    "http://xmlns.com/foaf/0.1/": "foaf",
    "http://spdx.org/rdf/terms#": "spdx",
    "http://www.w3.org/ns/locn#": "locn",
    "http://www.w3.org/2006/time#": "time",
    "http://www.w3.org/2004/02/skos/core#": "skos",
    "http://www.w3.org/ns/prov#": "prov",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
    "http://www.w3.org/2006/vcard/ns#": "vcard",
    "http://data.europa.eu/eli/ontology#": "eli",
    "http://www.w3.org/ns/adms#": "adms",
    "http://www.w3.org/ns/shacl#": "sh",
    "http://www.w3.org/2001/XMLSchema#": "xsd",
    ...options.defaultPrefixes,
  };

  // We do not want to use selected types for shacl:class check.
  // https://github.com/dataspecer/dataspecer/issues/1295
  const typesToIgnore: Set<string> = new Set([
    "http://www.w3.org/2000/01/rdf-schema#Resource",
    "http://www.w3.org/2000/01/rdf-schema#Literal",
  ]);

  const applyPrefix = (value: string) => {
    for (const [prefix, name] of Object.entries(prefixes)) {
      if (!value.startsWith(prefix)) {
        continue;
      }
      const suffix = encodeURIComponent(value.substring(prefix.length));
      if (isFragment) {
        return name + ":" + suffix;
      } else {
        // We need to encode ":".
        return name + "%3A" + suffix;
      }
    }
    return value;
  };

  const hashProperty = (profile: string, property: {
    path: string,
    datatype: string | null,
    class: string | null,
  }) => {
    // This is not a good solution, but should be fine for now.
    const type = property.datatype ?? property.class;
    const value = `${profile}:${property.path}:${type}`;
    return computeHash(value);
  };

  return {
    shaclModelIri: () => baseIri,
    shaclNodeShape: (_profile, type) =>
      `${baseIri}${applyPrefix(type)}Shape`,
    shaclPredicateShape: (profile, type, property) =>
      `${baseIri}${applyPrefix(type)}Shape/${hashProperty(profile, property)}`,
    nodeTypeFilter: items => items.filter(item => !typesToIgnore.has(item)),
    literalTypeFilter: items => items.filter(item => !typesToIgnore.has(item)),
    prefixes: () => Object.fromEntries(
      Object.entries(prefixes).map(([key, value]) => [value, key])
    ),
  }
}

const computeHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * {@link topProfileModel} must be part of {@link profileModels}.
 */
export function createShaclForProfile(
  semanticModels: SemanticModel[],
  profileModels: ProfileModel[],
  topProfileModel: ProfileModel,
  policy: ShaclForProfilePolicy,
): ShaclModel {

  // Prepare Lightweight OWL models.
  const owl = semanticModelToLightweightOwl(
    [], semanticModels, { baseIri: "", idDefinedBy: "" });

  // Prepare Data Specification Vocabulary (DSV).
  // We need a DSV for each model, as we need to be able to see
  // the full hierarchy.

  const dsv = createDataSpecificationVocabulary(
    { semantics: semanticModels, profiles: profileModels, },
    // Here we need to pass all model as we need the full hierarchy.
    // Without it we do not have the connection to OWL classes.
    [...profileModels, topProfileModel],
    { iri: "http://example.com/" });

  const structure = createStructureModelForProfile(owl, dsv);
  const classMap: Record<string, StructureClass> = {};
  structure.classes.forEach(item => classMap[item.iri] = item);

  const shapeMap: Map<StructureClass, ShaclNodeShape[]> = new Map();

  // For each entity we build a property shapes.
  for (const entity of structure.classes) {
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
  }

  return {
    iri: policy.shaclModelIri(),
    members,
  };
}

type ShaclPropertyShapeTemplate = Omit<ShaclPropertyShape, "iri">;

function buildPropertiesShapeTemplates(
  classMap: Record<string, StructureClass>,
  properties: StructureProperty[],
  policy: ShaclForProfilePolicy,
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
  policy: ShaclForProfilePolicy,
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
    return filteredRanges.map(type =>
      buildPropertyShapeTemplateForPrimitiveType(property, predicate, type));
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
  };
}

function buildPropertyShapeForTemplateComplexTypes(
  classMap: Record<string, StructureClass>,
  property: StructureProperty,
  predicate: string,
  ranges: string[],
  policy: ShaclForProfilePolicy,
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
  };
}

function buildShaclNodeShape(
  entity: StructureClass,
  type: string,
  properties: ShaclPropertyShapeTemplate[],
  policy: ShaclForProfilePolicy,
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
    } satisfies ShaclPropertyShape))
  }
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

type LanguageString = { [language: string]: string };

/**
 * Perform in-place modification of the model updating strings
 * using given filter.
 */
export function filterLanguageStringLiterals(
  model: ShaclModel,
  filter: (value: LanguageString) => LanguageString | null,
): void {
  const filterWrap = (value: LanguageString | null) => value === null
    ? null : filter(value);

  model.members.forEach(member => {
    member.propertyShapes.forEach(property => {
      property.name = filterWrap(property.name);
      property.description = filterWrap(property.description);
    });
  });
}
