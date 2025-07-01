import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  OwlOntology,
  OwlClass,
  OwlProperty,
  IRI,
  OwlPropertyType,
} from "./lightweight-owl-model.ts";
import {
  getDomainAndRange,
} from "@dataspecer/core-v2/semantic-model/relationship-utils";
import {
  isComplexType,
  isPrimitiveType,
} from "@dataspecer/core-v2/semantic-model/datatypes";
import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import { Entities, Entity } from "@dataspecer/core-v2";

const OWL_THING = "http://www.w3.org/2002/07/owl#Thing";

interface Context {

  idDefinedBy: string;

  baseIri: string;

}

// REMOVE THIS ONCE IN ANOTHER PACKAGE

type EntityModelChangeListener = (
  updated: Record<string, Entity>,
  removed: string[],
) => void;

interface EntityModel {

  getId(): string;

  getEntities(): Entities;

  subscribeToChanges(listener: EntityModelChangeListener): () => void;

}

interface SemanticModel extends EntityModel {

  getBaseIri(): string;

};


//

/**
 * The {@link referenceSemanticModels} should contain all entities referenced
 * from, but absent in, {@link semanticModels}.
 *
 * When multiple {@link SemanticModel} contain the same entity,
 * the last version of the entity is used.
 */
export function semanticModelToLightweightOwl(
  referenceSemanticModels: SemanticModel[],
  semanticModels: SemanticModel[],
  context: Context,
): OwlOntology {
  // We start by processing classes as they are referenced from
  // properties and generalizations.
  const { classes, classMapId } = prepareOwlClasses(
    referenceSemanticModels, semanticModels, context);

  // Next we load relationships.
  const { properties, propertyMapId } = prepareOwlProperties(
    referenceSemanticModels, semanticModels, context, classMapId);

  // Last we load generalizations.
  for (const semanticModel of semanticModels) {
    loadGeneralizationsInto(semanticModel, classMapId, propertyMapId);
  }

  return {
    classes,
    properties,
  };
}

function prepareOwlClasses(
  referenceSemanticModels: SemanticModel[],
  semanticModels: SemanticModel[],
  context: Context,
): {
  classes: OwlClass[],
  classMapId: { [identifier: string]: OwlClass },
} {
  // First we add data from referenced models.
  const classMapId: { [identifier: string]: OwlClass } = {};
  for (const model of referenceSemanticModels) {
    const baseIri = selectBaseIri(model, context);
    loadOwlClassesInto(
      model, context.idDefinedBy, baseIri, [], classMapId);
  }

  // Next we add from other models, here we also store classes to result.
  const classes: OwlClass[] = [];
  for (const model of semanticModels) {
    const baseIri = selectBaseIri(model, context);
    loadOwlClassesInto(
      model, context.idDefinedBy, baseIri, classes, classMapId);
  }

  return { classes, classMapId };
}

function selectBaseIri(model: SemanticModel, context: Context): string {
  if (model instanceof InMemorySemanticModel) {
    return model.getBaseIri();
  }
  if ((model as any).getBaseIri !== undefined) {
    return (model as any).getBaseIri();
  }
  return context.baseIri;
}

function loadOwlClassesInto(
  semanticModel: SemanticModel,
  idDefinedBy: string,
  baseIri: string,
  classes: OwlClass[],
  classMapId: { [identifier: string]: OwlClass },
): void {
  for (const entity of Object.values(semanticModel.getEntities())) {
    if (!isSemanticModelClass(entity)) {
      continue;
    }
    const newClass: OwlClass = {
      iri: baseIri + (entity.iri ?? entity.id),
      name: entity.name,
      description: entity.description,
      subClassOf: [],
      isDefinedBy: idDefinedBy,
    };
    classes.push(newClass);
    classMapId[entity.id] = newClass;
  }
}

function prepareOwlProperties(
  referenceSemanticModels: SemanticModel[],
  semanticModels: SemanticModel[],
  context: Context,
  classMapId: { [identifier: string]: OwlClass },
): {
  properties: OwlProperty[],
  propertyMapId: { [identifier: string]: OwlProperty },
} {
  // First we add data from referenced models.
  const propertyMapId: { [identifier: string]: OwlProperty } = {};
  for (const model of referenceSemanticModels) {
    const baseIri = selectBaseIri(model, context);
    loadOwlPropertiesInto(
      model, context.idDefinedBy, baseIri, classMapId, [], propertyMapId);
  }

  // Next we add from other models, here we also store classes to result.
  const properties: OwlProperty[] = [];
  for (const model of semanticModels) {
    const baseIri = selectBaseIri(model, context);
    loadOwlPropertiesInto(
      model, context.idDefinedBy, baseIri, classMapId, properties,
      propertyMapId);
  }

  return { properties, propertyMapId };
}


function loadOwlPropertiesInto(
  semanticModel: SemanticModel,
  idDefinedBy: string,
  baseIri: string,
  classMapId: { [identifier: string]: OwlClass },
  properties: OwlProperty[],
  propertyMapId: { [identifier: string]: OwlProperty },
): void {

  /**
   * Retrieve and return IRI of identified entity.
   */
  const resolveIri = (identifier: string | null | undefined): string => {
    if (identifier === null || identifier === undefined) {
      return OWL_THING;
    }
    const owlClass = classMapId[identifier];
    return owlClass?.iri ?? identifier ?? OWL_THING;
  };

  for (const entity of Object.values(semanticModel.getEntities())) {
    if (!isSemanticModelRelationship(entity)) {
      continue;
    }
    const ends = getDomainAndRange(entity);
    const domainEnd = ends?.domain;
    const rangeEnd = ends?.range;
    const iri = baseIri + (rangeEnd?.iri ?? entity.iri ?? entity.id);
    const range = resolveIri(rangeEnd?.concept);
    const newProperty: OwlProperty = {
      iri,
      name: rangeEnd?.name ?? {},
      description: rangeEnd?.description ?? {},
      isDefinedBy: idDefinedBy,
      subPropertyOf: [],
      domain: resolveIri(domainEnd?.concept),
      range,
      type: determineType(range),
    };
    properties.push(newProperty);
    propertyMapId[entity.id] = newProperty;
  }
}

function determineType(range: IRI): OwlPropertyType | null {
  const isPrimitive = isPrimitiveType(range);
  const isComplex = isComplexType(range);
  if (isPrimitive && !isComplex) {
    return OwlPropertyType.DatatypeProperty;
  } else if (!isPrimitive && isComplex) {
    return OwlPropertyType.ObjectProperty;
  } else {
    // We can not decide.
    return null;
  }
}

function loadGeneralizationsInto(
  semanticModel: SemanticModel,
  classMapId: { [identifier: string]: OwlClass },
  propertyMapId: { [identifier: string]: OwlProperty },
) {
  for (const entity of Object.values(semanticModel.getEntities())) {
    if (!isSemanticModelGeneralization(entity)) {
      continue;
    }
    // We can have generalization of a class ...
    const classChild = classMapId[entity.child];
    if (classChild !== undefined) {
      const parent = classMapId[entity.parent]?.iri ?? entity.parent;
      classChild.subClassOf.push(parent);
    }
    // or a property.
    const propertyChild = propertyMapId[entity.child];
    if (propertyChild !== undefined) {
      const parent = propertyMapId[entity.parent]?.iri ?? entity.parent;
      propertyChild.subPropertyOf.push(parent);
    }
  }
}
