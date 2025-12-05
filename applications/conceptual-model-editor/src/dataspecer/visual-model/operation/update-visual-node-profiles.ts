import { isVisualProfileRelationship, WritableVisualModel } from "@dataspecer/visual-model";
import { CmeReference, isCmeReferenceEqual } from "@/dataspecer/cme-model/model";

/**
 * Propagate changes in the list of profiles to the visual model.
 * Add new profile relations and delete removed relations.
 *
 * If the entity is not represented in visual model then to nothing.
 * If target entity does not exist in visual model do nothing.
 */
export function updateVisualNodeProfiles(
  visualModel: WritableVisualModel,
  profile: CmeReference,
  previous: CmeReference[],
  next: CmeReference[],
) {
  const { create, remove } = createChangeList(
    previous, next, isCmeReferenceEqual);
  const entityVisuals = visualModel.getVisualEntitiesForRepresented(
    profile.identifier);
  if (entityVisuals.length === 0) {
    // There should be no relationship for this entity in the model.
    return;
  }
  // Add new.
  for (const item of create) {
    const visuals = visualModel.getVisualEntitiesForRepresented(item.identifier);
    if (visuals.length === 0) {
      continue;
    }
    for(const entityVisual of entityVisuals) {
      for(const visual of visuals) {
        visualModel.addVisualProfileRelationship({
          entity: profile.identifier,
          model: profile.model,
          visualSource: entityVisual.identifier,
          visualTarget: visual.identifier,
          waypoints: [],
        });
      }
    }
  }
  // We can not delete directly the visual profile as the entity
  // is shared by the profile and the visual node.
  if (remove.length > 0) {
    const removeSet = new Set(remove.map(item => item.identifier));
    const visuals = [...visualModel.getVisualEntities().values()];
    for (const visual of visuals) {
      if (!isVisualProfileRelationship(visual)) {
        // It is not a profile.
        continue;
      }
      if (removeSet.has(visual.entity)) {
        visualModel.deleteVisualEntity(visual.identifier);
      }
    }
  }
}

/**
 * @returns Changes that need to happen to get from previous to next.
 */
function createChangeList<Type>(
  previous: Type[],
  next: Type[],
  eq: (left: Type, right: Type) => boolean,
): {
  create: Type[],
  remove: Type[],
} {
  return {
    create: filterItems(next, previous, eq),
    remove: filterItems(previous, next, eq),
  };
}

/**
 * @returns Items that are in the first array but not in the second one.
 */
function filterItems<Type>(
  items: Type[],
  remove: Type[],
  eq: (left: Type, right: Type) => boolean,
): Type[] {
  return items.filter(item => remove.find(removeItem => eq(item, removeItem)) === undefined);
}
