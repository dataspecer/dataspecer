import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmAssociationEnd } from "@dataspecer/core/data-psm/model/data-psm-association-end";
import { DataPsmAttribute } from "@dataspecer/core/data-psm/model/data-psm-attribute";
import { DataPsmClass } from "@dataspecer/core/data-psm/model/data-psm-class";
import type { DataPsmBaseResource } from "@dataspecer/core/data-psm/model/data-psm-resource";
import { canonicalizeIds } from "../utils/canonicalize-ids.ts";

export interface CreateStructureProfileOptions {
  /**
   * Mapping from old IRIs to new IRIs for the created profiles.
   */
  newIriMapping?: Record<string, string>;
}

type GetByProfiling = (profiledEntityId: string) => string | null;

/**
 * Creates structure profiles for selected structures. If there are references,
 * they will be preserved if the referenced schema is also profiled, otherwise
 * they will reference the original structure. If the profiled entities do not
 * exist, they will be created. There is no selection process if there are more
 * semantic profiles for given profile.
 *
 * @param getByProfiling Function that returns id of the entity that profiles
 * the given entity.
 */
export async function createStructureProfile(
  structuresToProfile: CoreResource[][],
  getByProfiling: GetByProfiling,
  options: CreateStructureProfileOptions,
): Promise<CoreResource[][]> {
  const iriMapping = options.newIriMapping || {};

  const clonedModels = canonicalizeIds(structuresToProfile, iriMapping);

  const reverseMapping = Object.fromEntries(Object.entries(iriMapping).map(([oldIri, newIri]) => [newIri, oldIri]));

  // Now, we need to update all entities to set their profile references
  for (const model of clonedModels) {
    for (const entity of model.model) {
      (entity as DataPsmBaseResource).profiling = [reverseMapping[entity.iri!]!];

      if ((DataPsmAssociationEnd.is(entity) || DataPsmAttribute.is(entity) || DataPsmClass.is(entity)) && entity.dataPsmInterpretation) {
        const localEntityId = getByProfiling(entity.dataPsmInterpretation);
        if (localEntityId) {
          entity.dataPsmInterpretation = localEntityId;
        } else {
          console.error(
            `Unable to create structure profile of ${model.fileNamePart} because the entity ${entity.iri} has interpretation ${entity.dataPsmInterpretation} that cannot be profiled nor its profile does not exists yet.`,
          );
        }
      }
    }
  }

  return clonedModels.map((m) => m.model);
}
