import type { XmlStructureModel } from "../../xml-structure-model/model/xml-structure-model.ts";

/**
 * Map from entity PSM IRI to the level index where it was originally defined.
 * This is built by scanning all models in the profiling chain.
 */
export type EntityOriginMap = Map<string, number>;

/**
 * Builds a map from entity PSM IRI (from all levels) to the level index where it originates.
 * An entity originates at a level if it has no profiling (was newly created there).
 *
 * The map is built by:
 * 1. Processing each level from base to derived
 * 2. For entities with no profiling, they originate at their current level
 * 3. For entities with profiling, we look up where the profiled entity originated
 *
 * This ensures that when processing source of truth (C), we can look up
 * where an entity's root definition is by tracing back through profiling.
 */
export function buildEntityOriginMap(profilingChain: XmlStructureModel[]): EntityOriginMap {
  const originMap: EntityOriginMap = new Map();

  // Process each level from base to derived
  for (let levelIndex = 0; levelIndex < profilingChain.length; levelIndex++) {
    const model = profilingChain[levelIndex];

    // Helper to process an entity and determine its origin
    const processEntity = (entity: { psmIri: string | null; profiling: string[] }) => {
      if (!entity.psmIri) return;

      if (entity.profiling.length === 0) {
        // Entity has no profiling - it was newly created at this level
        originMap.set(entity.psmIri, levelIndex);
      } else {
        // Entity profiles something - inherit origin from the profiled entity
        const profiledIri = entity.profiling[0];
        const profiledOrigin = originMap.get(profiledIri);
        if (profiledOrigin !== undefined) {
          // Inherit the origin from the profiled entity
          originMap.set(entity.psmIri, profiledOrigin);
        } else {
          // Profiled entity not found - this shouldn't happen in a valid profiling chain
          // Fall back to current level
          originMap.set(entity.psmIri, levelIndex);
        }
      }
    };

    // Collect all entities (classes and properties) from this model
    const allClasses = model.getClasses();

    for (const cls of allClasses) {
      processEntity(cls);
      for (const prop of cls.properties) {
        processEntity(prop);
      }
    }

    // Also process roots
    for (const root of model.roots) {
      for (const cls of root.classes) {
        processEntity(cls);
        for (const prop of cls.properties) {
          processEntity(prop);
        }
      }
    }
  }

  return originMap;
}
