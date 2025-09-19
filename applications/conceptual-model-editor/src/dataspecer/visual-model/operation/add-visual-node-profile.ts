import { WritableVisualModel } from "@dataspecer/visual-model";
import { DataspecerError } from "../../dataspecer-error";
import { CmeReference } from "@/dataspecer/cme-model/model";

/**
 * Adds a visual representation for class profile.
 *
 * @throws DataspecerError
  */
export function addVisualNodeProfile(
  visualModel: WritableVisualModel,
  profile: CmeReference,
  profiled: CmeReference,
) {
  const sources = visualModel.getVisualEntitiesForRepresented(profile.identifier);
  const targets = visualModel.getVisualEntitiesForRepresented(profiled.identifier);
  if (sources.length === 0 || targets.length === 0) {
    console.error("Missing visual representation",
      { profile, profiled, visualSource: sources, visualTarget: targets });
    throw new DataspecerError("Can not add visual node profile.");
  }

  for (const source of sources) {
    for (const target of targets) {
      visualModel.addVisualProfileRelationship({
        entity: profile.identifier,
        model: profile.model,
        visualSource: source.identifier,
        visualTarget: target.identifier,
        waypoints: [],
      });
    }
  }
}
