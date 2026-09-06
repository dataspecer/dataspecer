import { type Dispatch, type SetStateAction } from "react";

import type { Entity } from "@dataspecer/core-v2/entity-model";
import { isVisualModel } from "@dataspecer/visual-model";
import {
  type AggregatedEntityWrapper,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { bothEndsHaveAnIri } from "./util/relationship-utils";

/**
 * Extracted from page.tsx as-is so it can be characterization-tested.
 *
 * Registers a subscription callback at the aggregator, that:
 * - removes whatever was removed from the models registered at the aggregator from the `ClassContext`
 * - goes through the updated elements
 * - based on their types puts them to their respective buckets - classes, relationships, etc
 */
export function propagateAggregatorChangesToLocalState(
  updated: AggregatedEntityWrapper[],
  removed: string[],
  // Local state.
  setClasses: Dispatch<SetStateAction<SemanticModelClass[]>>,
  setRelationships: Dispatch<SetStateAction<SemanticModelRelationship[]>>,
  setGeneralizations: Dispatch<SetStateAction<SemanticModelGeneralization[]>>,
  setRawEntities: Dispatch<SetStateAction<(Entity | null)[]>>,
  setSourceModelOfEntityMap: Dispatch<SetStateAction<Map<string, string>>>,
  setClassProfiles: Dispatch<SetStateAction<SemanticModelClassProfile[]>>,
  setRelationshipProfiles: Dispatch<SetStateAction<SemanticModelRelationshipProfile[]>>,
  aggregator: SemanticModelAggregatorView,
) {

  // Prepare update.
  const localSourceMap = new Map<string, string>();
  const {
    updatedClasses,
    updatedRelationships,
    updatedGeneralizations,
    updatedRawEntities,
    updatedClassProfiles,
    updatedRelationshipProfiles,
  } = updated.reduce(
    (
      {
        updatedClasses,
        updatedRelationships,
        updatedGeneralizations,
        updatedRawEntities,
        updatedClassProfiles,
        updatedRelationshipProfiles,
      },
      curr
    ) => {
      //
      if (isSemanticModelClass(curr.aggregatedEntity)) {
        return {
          updatedClasses: updatedClasses.concat(curr.aggregatedEntity),
          updatedRelationships,
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelRelationship(curr.aggregatedEntity)) {
        if (bothEndsHaveAnIri(curr.aggregatedEntity)) {
          console.warn(
            "Both ends have an IRI, skipping.",
            curr.aggregatedEntity,
            curr.aggregatedEntity.ends
          );
          return {
            updatedClasses,
            updatedRelationships,
            updatedGeneralizations,
            updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
            updatedClassProfiles,
            updatedRelationshipProfiles,
          };
        }
        return {
          updatedClasses,
          updatedRelationships: updatedRelationships.concat(curr.aggregatedEntity),
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelGeneralization(curr.aggregatedEntity)) {
        return {
          updatedClasses,
          updatedRelationships,
          updatedGeneralizations: updatedGeneralizations.concat(curr.aggregatedEntity),
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelClassProfile(curr.aggregatedEntity)) {
        return {
          updatedClasses,
          updatedRelationships,
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles: updatedClassProfiles.concat(curr.aggregatedEntity),
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelRelationshipProfile(curr.aggregatedEntity)) {
        return {
          updatedClasses,
          updatedRelationships,
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles: updatedRelationshipProfiles.concat(curr.aggregatedEntity),
        };
      } else {
        console.error("Unknown type of updated entity", curr.aggregatedEntity);
        throw new Error("Unknown type of updated entity.");
      }
    },
    {
      updatedClasses: [] as SemanticModelClass[],
      updatedRelationships: [] as SemanticModelRelationship[],
      updatedGeneralizations: [] as SemanticModelGeneralization[],
      updatedRawEntities: [] as (Entity | null)[],
      updatedClassProfiles: [] as SemanticModelClassProfile[],
      updatedRelationshipProfiles: [] as SemanticModelRelationshipProfile[],
    }
  );

  const models = aggregator.getModels();
  for (const model of models.values()) {
    const modelId = model.getId();
    if (isVisualModel(model)) {
      // We ignore those.
      continue;
    }
    Object.values(model.getEntities()).forEach((e) => localSourceMap.set(e.id, modelId));
  }
  setSourceModelOfEntityMap(new Map(localSourceMap));

  // Update local state.
  const removedIds = new Set(removed);
  setClasses(prev => updateItems(prev, removedIds, updatedClasses));
  setRelationships(prev => updateItems(prev, removedIds, updatedRelationships));
  setGeneralizations(prev => updateItems(prev, removedIds, updatedGeneralizations));
  setRawEntities(prev => updateItems(
    prev.filter(item => item !== null),
    removedIds,
    updatedRawEntities.filter(item => item !== null)));
  setClassProfiles(prev => updateItems(prev, removedIds, updatedClassProfiles));
  setRelationshipProfiles(prev => updateItems(prev, removedIds, updatedRelationshipProfiles));
}

export function updateItems<Type extends { id: string }>(items: Type[], removed: Set<string>, changed: Type[]): Type[] {
  if (removed.size === 0 && changed.length === 0) {
    return items;
  }
  // Remove
  let result = items.filter(item => !removed.has(item.id));
  // Build change map.
  const changeMap: Record<string, Type | null> = {};
  changed.forEach(item => changeMap[item.id] = item);
  // Update and remove from change map.
  result = result.map((item) => {
    const next = changeMap[item.id];
    if (next === undefined) {
      return item;
    } else {
      changeMap[item.id] = null;
      return next!;
    }
  });
  // Add non-null items as new.
  Object.values(changeMap).filter(item => item !== null)
    .forEach(item => result.push(item));
  return result;
}
