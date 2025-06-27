import { ShaclModel, ShaclNodeKind, ShaclNodeShape, ShaclPropertyShape } from "./shacl-model/shacl-model.ts";
import { ProfileModel } from "./profile-model/profile-model.ts";
import { SemanticModel } from "./semantic-model/semantic-model.ts";
import { semanticModelToLightweightOwl } from "./lightweight-owl/index.ts";
import { createContext, entityListContainerToConceptualModel } from "@dataspecer/core-v2/semantic-model/data-specification-vocabulary";
import { createStructureModel, StructureClass, StructureModel, StructureProperty } from "./structure-model/index.ts";
import { isComplexType, isPrimitiveType } from "@dataspecer/core-v2/semantic-model/datatypes";

export interface ShaclForProfilePolicy {

  /**
   * @returns String to be used for the root of the SHACL shape.
   */
  shaclModelIri: () => string;

  /**
   * @param entity IRI of represented profile.
   * @param type IRI of represented RDF type.
   */
  shaclNodeShape: (profile: string, type: string) => string;

  shaclPredicateShape: (profile: string, type: string, predicate: {
    path: string,
    datatype: string | null,
    class: string | null,
    minCount: number | null,
    maxCount: number | null,
  }) => string;

}

// https://github.com/SEMICeu/DCAT-AP/blob/master/releases/3.0.0/shacl/dcat-ap-SHACL.ttl
export function createSemicShaclStylePolicy(fileUrl: string): ShaclForProfilePolicy {
  const prefixes: Record<string, string> = {
    "http://www.w3.org/ns/dcat#": "dcat:",
    "http://purl.org/dc/terms/": "dcterms:",
    "http://xmlns.com/foaf/0.1/": "foaf:",
    "http://spdx.org/rdf/terms#": "spdx:",
    "http://www.w3.org/ns/locn#": "locn:",
    "http://www.w3.org/2006/time#": "time:",
    "http://www.w3.org/2004/02/skos/core#": "skos",
    "http://www.w3.org/ns/prov#": "prov:"
  };

  const applyPrefix = (value: string) => {
    for (const [prefix, name] of Object.entries(prefixes)) {
      if (value.startsWith(prefix)) {
        return name + encodeURIComponent(value.substring(prefix.length));
      }
    }
    return value;
  };

  const hashProperty = (property: {
    path: string,
    datatype: string | null,
    class: string | null,
    minCount: number | null,
    maxCount: number | null,
  }) => {
    // This is not a good solution, but should be fine for now.
    const value = JSON.stringify(property);
    return computeHash(value);
  };

  return {
    shaclModelIri: () => fileUrl,
    shaclNodeShape: (_profile, type) =>
      `${fileUrl}#${applyPrefix(type)}Shape`,
    shaclPredicateShape: (_profile, type, property) =>
      `${fileUrl}#${applyPrefix(type)}Shape/${hashProperty(property)}`,
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

  // Prepare Data Specification Vocabulary (DSW).
  // We need a DSV for each model, as we need to be able to see
  // the full hierarchy.

  const semanticList = semanticModels.map(model => ({
    baseIri: (model as any).getBaseIri === undefined ? "" : (model as any).getBaseIri(),
    entities: Object.values(model.getEntities()),
  }));

  const profileList = profileModels.map(model => ({
    baseIri: (model as any).getBaseIri === undefined ? "" : (model as any).getBaseIri(),
    entities: Object.values(model.getEntities()),
  }));

  const context = createContext([
    ...semanticList,
    ...profileList,
  ]);

  const dsv = profileList.map(
    item => entityListContainerToConceptualModel("", item, context));

  const topDsv = entityListContainerToConceptualModel("", {
    baseIri: (topProfileModel as any).getBaseIri === undefined ? "" : (topProfileModel as any).getBaseIri(),
    entities: Object.values(topProfileModel.getEntities()),
  }, context);

  // Prepare structure model.
  const inclusionFilter = topDsv.profiles.map(item => item.iri);

  const structure = createStructureModel(
    owl,
    { iri: "", profiles: dsv.map(item => item.profiles).flat() },
    identifier => inclusionFilter.includes(identifier));

  // structure.classes.forEach(item => {
  //   console.log({
  //     iri: item.iri,
  //     properties: item.properties.map(item => ({
  //       iri: item.iri,
  //     }))
  //   })
  // });


  const classMap: Record<string, StructureClass> = {};
  structure.classes.forEach(item => classMap[item.iri] = item);

  const shapeMap: Map<StructureClass, ShaclNodeShape[]> = new Map();

  // For each entity we build a property shapes.
  for (const entity of structure.classes) {
    // First we build a list of all properties for the given entity
    // as templates. The reason is we do not have a complete information
    // about them yet.
    const propertyShapesTemplates = buildPropertiesShapeTemplates(
      classMap, entity.properties);

    // We need shape for every type.
    const shapes = entity.types.map(type => buildShaclNodeShape(
      entity, type, propertyShapesTemplates, policy));

    shapeMap.set(entity, shapes);
  }

  // console.log(JSON.stringify(result.members, null, 2));

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
): ShaclPropertyShapeTemplate[] {
  const result: ShaclPropertyShapeTemplate[] = [];
  for (const property of properties) {
    // Each property can be expressed using multiple predicates.
    for (const predicate of property.predicates) {
      for (const range of property.range) {
        const isComplex = isComplexType(range);
        const isPrimitive = isPrimitiveType(range);
        if (isPrimitive && !isComplex) {
          result.push(buildPropertyShapeTemplateForPrimitiveType(
            property, predicate, range));
        } else if (!isPrimitive && isComplex) {
          result.push(...buildPropertyShapeForTemplateComplexType(
            classMap, property, predicate, range));
        } else {
          // Can be both or neither, it should not happen.
          console.warn("Unexpected type.",
            { isPrimitive, isComplex, property, range });
        }
      }
    }
  }
  return result;
}

function buildPropertyShapeTemplateForPrimitiveType(
  property: StructureProperty,
  predicate: string,
  range: string,
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

function buildPropertyShapeForTemplateComplexType(
  classMap: Record<string, StructureClass>,
  property: StructureProperty,
  predicate: string,
  range: string,
): ShaclPropertyShapeTemplate[] {
  const result: ShaclPropertyShapeTemplate[] = [];
  // We may not have the information about the class, only the type
  // but that is fine.
  const types = classMap[range]?.types ?? [range];
  for (const type of types) {
    result.push({
      seeAlso: property.iri,
      description: property.usageNote,
      name: property.name,
      nodeKind: ShaclNodeKind.BlankNodeOrIRI,
      path: predicate,
      minCount: property.rangeCardinality.min,
      maxCount: property.rangeCardinality.max,
      datatype: null,
      class: type,
    });
  }
  return result;
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

function buildFullParentMap(classMap: Record<string, StructureClass>): Record<string, string[]> {
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
