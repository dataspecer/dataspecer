import { isMainSemanticModelEntity, isSemanticModelGeneralization, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isControlledVocabularyAssignment,
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  type SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmExternalRoot } from "@dataspecer/core/data-psm/model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { garbageCollectStructureModel } from "./garbage-collect-structure-model.ts";

/**
 * Returns a new profile record containing the semantic closure of the supplied
 * structures' schema roots. Entity objects are shared; no input is modified.
 *
 * First collects each structure with garbageCollectStructureModel, then uses
 * the retained interpretations and external-root types as semantic roots.
 * Semantic dependencies include profiling and text-inheritance sources,
 * relationship endpoints, upward generalizations, and controlled-vocabulary
 * assignments and replacements. A retained class does not retain all its
 * properties or subclasses.
 *
 * Only dependencies inside profileModel are traversed; external references are
 * preserved. Every supplied structure contributes its roots. External
 * structures are not loaded. Main model metadata survives even with no roots.
 * Missing internal structural references throw; external model references
 * remain external.
 */
export function garbageCollectProfileModel(profileModel: EntityRecord, structureModels: Readonly<Record<ModelIdentifier, EntityRecord>>): EntityRecord {
  const pending: string[] = [];
  for (const model of Object.values(structureModels)) {
    for (const entity of Object.values(garbageCollectStructureModel(model))) {
      if ("dataPsmInterpretation" in entity && typeof entity.dataPsmInterpretation === "string") {
        pending.push(entity.dataPsmInterpretation);
      }
      const resource = { ...entity, types: entity.type ?? (entity as unknown as CoreResource).types };
      if (DataPsmExternalRoot.is(resource)) pending.push(...resource.dataPsmTypes);
    }
  }

  const generalizations = new Map<string, string[]>();
  for (const entity of Object.values(profileModel)) {
    if (!isSemanticModelGeneralization(entity)) continue;
    const ids = generalizations.get(entity.child) ?? [];
    ids.push(entity.id);
    generalizations.set(entity.child, ids);
  }
  const retained = new Set<string>();
  function retainProfileSources(profile: Pick<SemanticModelClassProfile, "profiling" | "nameFromProfiled" | "descriptionFromProfiled" | "usageNoteFromProfiled">) {
    pending.push(...(profile.profiling ?? []));
    for (const id of [profile.nameFromProfiled, profile.descriptionFromProfiled, profile.usageNoteFromProfiled]) {
      if (id) pending.push(id);
    }
  }
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (retained.has(id)) continue;
    retained.add(id);
    const entity = profileModel[id];
    if (!entity) continue;
    pending.push(...(generalizations.get(id) ?? []));
    if (isSemanticModelClassProfile(entity)) {
      retainProfileSources(entity);
      pending.push(...(entity.controlledVocabularies ?? []));
    } else if (isSemanticModelRelationshipProfile(entity)) {
      for (const end of entity.ends) {
        retainProfileSources(end);
        if (end.concept) pending.push(end.concept);
      }
    } else if (isSemanticModelRelationship(entity)) {
      for (const end of entity.ends) if (end.concept) pending.push(end.concept);
    } else if (isSemanticModelGeneralization(entity)) {
      pending.push(entity.child, entity.parent);
    } else if (isControlledVocabularyAssignment(entity)) {
      pending.push(entity.classProfile, entity.vocabulary);
      if (entity.replaces?.kind === "local") pending.push(entity.replaces.target);
    }
  }
  return Object.fromEntries(Object.entries(profileModel).filter(([id, entity]) => retained.has(id) || isMainSemanticModelEntity(entity)));
}
