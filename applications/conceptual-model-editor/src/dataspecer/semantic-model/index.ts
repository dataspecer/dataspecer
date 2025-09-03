import { Entity, EntityModel } from "@dataspecer/core-v2";
import { SemanticModelAggregator } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isRepresentingAttribute } from "../../dialog/utilities/dialog-utilities";
import { EntityDsIdentifier } from "../entity-model";
import { Operation } from "@dataspecer/core-v2/semantic-model/operations";

export * from "./data-type";
export * from "./external-semantic-model";
export * from "./in-memory-semantic-model";
export * from "./semantic-model-factory";
export * from "./semantic-model-utilities";

export {
  isPrimitiveType as isSemanticPrimitiveType,
  isComplexType as isSemanticComplexType,
} from "@dataspecer/core-v2/semantic-model/datatypes";

// This is to compile with TypeScript as we can not use
// the type directly for aggregator.
const _SemanticModelAggregatorInstance = new SemanticModelAggregator();

export type SemanticModelAggregatorType = typeof _SemanticModelAggregatorInstance;

export type SemanticEntity = Entity;

export type SemanticOperation = Operation;

export type SemanticModel = EntityModel;

/**
 * @deprecated
 */
export function isSemanticModelAttributeProfile(
  resource: Entity | null,
): resource is SemanticModelRelationshipProfile {
  if (!isSemanticModelRelationshipProfile(resource)) {
    return false;
  }
  // We just convert this to known problem.
  // As we do not know which end is the right one, we just try both of them.
  return isRepresentingAttribute({
    identifier: resource.id,
    range: resource.ends[0]?.concept
  }) || isRepresentingAttribute({
    identifier: resource.id,
    range: resource.ends[1]?.concept
  });
}

const OWL_THING_IDENTIFIER = "https://www.w3.org/2002/07/owl#Thing";

export function isOwlThing(identifier: EntityDsIdentifier): boolean {
  return identifier === OWL_THING_IDENTIFIER;
}
