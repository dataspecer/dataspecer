import { isSemanticModelGeneralization, type SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  createGeneralization,
  deleteEntity,
  isCreateGeneralizationOperation,
  isDeleteEntityOperation,
  isModifyGeneralizationOperation,
  type CreateGeneralizationOperation,
  type DeleteEntityOperation,
  type ModifyGeneralizationOperation,
} from "@dataspecer/core-v2/semantic-model/operations";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  type SemanticModelClassProfile,
  type SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  createDefaultSemanticModelProfileOperationFactory,
  isCreateSemanticModelClassProfile,
  isCreateSemanticModelRelationshipProfile,
  isModifySemanticModelClassProfile,
  isModifySemanticModelRelationshipEndProfile,
  isModifySemanticModelRelationshipProfile,
  type CreateSemanticModelClassProfile,
  type CreateSemanticModelRelationshipProfile,
  type ModifySemanticModelClassProfile,
  type ModifySemanticModelRelationshipEndProfile,
  type ModifySemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { deepEqual } from "@dataspecer/utilities";
import { type ProfileOperation } from "../profile-model.ts";
import type { EvolutionProposal } from "./semantic-model.ts";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * Given a profile model operation performed on a parent application profile
 * (before it is applied), proposes evolution operations for a dependent (child)
 * application profile that profiles it.
 *
 * IRI changes are intentionally not proposed here, as resolving them is complex
 * and is left to the user.
 *
 * Both entity records represent the state BEFORE the operation is applied.
 */
export function reactToProfileModelOperation(parentProfileModelEntities: EntityRecord, operation: ProfileOperation, childProfileModelEntities: EntityRecord): EvolutionProposal[] {
  if (isCreateSemanticModelClassProfile(operation)) {
    return reactToCreateClassProfile(operation);
  }
  if (isModifySemanticModelClassProfile(operation)) {
    return reactToModifyClassProfile(parentProfileModelEntities, operation, childProfileModelEntities);
  }
  if (isCreateSemanticModelRelationshipProfile(operation)) {
    return reactToCreateRelationshipProfile(operation, childProfileModelEntities);
  }
  if (isModifySemanticModelRelationshipProfile(operation)) {
    return reactToModifyRelationshipProfile(parentProfileModelEntities, operation, childProfileModelEntities);
  }
  if (isModifySemanticModelRelationshipEndProfile(operation)) {
    return reactToModifyRelationshipEndProfile(parentProfileModelEntities, operation, childProfileModelEntities);
  }
  if (isCreateGeneralizationOperation(operation)) {
    return reactToCreateGeneralization(operation, childProfileModelEntities);
  }
  if (isModifyGeneralizationOperation(operation)) {
    return reactToModifyGeneralization(parentProfileModelEntities, operation, childProfileModelEntities);
  }
  if (isDeleteEntityOperation(operation)) {
    return reactToDeleteEntity(parentProfileModelEntities, operation, childProfileModelEntities);
  }
  return [];
}

function reactToCreateClassProfile(operation: CreateSemanticModelClassProfile): EvolutionProposal[] {
  const entity = operation.entity;
  return [
    {
      label: `Create profile for class profile "${displayName(entity.name)}"`,
      operations: [
        factory.createClassProfile({
          iri: null,
          profiling: [entity.id],
          name: null,
          nameFromProfiled: entity.id,
          description: null,
          descriptionFromProfiled: entity.id,
          usageNote: entity.usageNote,
          usageNoteFromProfiled: entity.id,
          externalDocumentationUrl: entity.externalDocumentationUrl,
          tags: entity.tags,
        }),
      ],
    },
  ];
}

function reactToModifyClassProfile(
  parentProfileModelEntities: EntityRecord,
  operation: ModifySemanticModelClassProfile,
  childProfileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const classId = operation.identifier;
  const previousClass = parentProfileModelEntities[classId];
  if (!isSemanticModelClassProfile(previousClass)) return [];

  const profiles = findClassProfilesProfilingEntity(childProfileModelEntities, classId);
  if (profiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];
  const entity = operation.entity;

  for (const profile of profiles) {
    proposals.push(
      ...reactToTrackedFieldChange({
        profileId: profile.id,
        sourceId: classId,
        fieldLabel: "name",
        newValue: entity.name,
        oldValue: previousClass.name,
        currentValue: profile.name,
        currentFromProfiled: profile.nameFromProfiled,
        currentProfiling: profile.profiling,
        buildOperation: (patch) => factory.modifyClassProfile(profile.id, patch),
      }),
    );

    proposals.push(
      ...reactToTrackedFieldChange({
        profileId: profile.id,
        sourceId: classId,
        fieldLabel: "description",
        newValue: entity.description,
        oldValue: previousClass.description,
        currentValue: profile.description,
        currentFromProfiled: profile.descriptionFromProfiled,
        currentProfiling: profile.profiling,
        buildOperation: (patch) =>
          factory.modifyClassProfile(profile.id, {
            description: patch.name,
            descriptionFromProfiled: patch.nameFromProfiled,
            profiling: patch.profiling,
          }),
      }),
    );

    proposals.push(
      ...reactToTrackedFieldChange({
        profileId: profile.id,
        sourceId: classId,
        fieldLabel: "usage note",
        newValue: entity.usageNote,
        oldValue: previousClass.usageNote,
        currentValue: profile.usageNote,
        currentFromProfiled: profile.usageNoteFromProfiled,
        currentProfiling: profile.profiling,
        buildOperation: (patch) =>
          factory.modifyClassProfile(profile.id, {
            usageNote: patch.name,
            usageNoteFromProfiled: patch.nameFromProfiled,
            profiling: patch.profiling,
          }),
      }),
    );

    // External documentation URL: plain value, no inheritance tracking.
    if (entity.externalDocumentationUrl !== undefined && entity.externalDocumentationUrl !== previousClass.externalDocumentationUrl) {
      proposals.push({
        label: `[Profile ${profile.id}] Update external documentation URL`,
        operations: [
          factory.modifyClassProfile(profile.id, {
            externalDocumentationUrl: entity.externalDocumentationUrl,
          }),
        ],
      });
    }

    // Tags: plain value, no inheritance tracking.
    if (entity.tags !== undefined && !deepEqual(entity.tags, previousClass.tags)) {
      proposals.push({
        label: `[Profile ${profile.id}] Update tags`,
        operations: [
          factory.modifyClassProfile(profile.id, {
            tags: entity.tags,
          }),
        ],
      });
    }
  }

  return proposals;
}

function reactToCreateRelationshipProfile(operation: CreateSemanticModelRelationshipProfile, childProfileModelEntities: EntityRecord): EvolutionProposal[] {
  const entity = operation.entity;
  const ends = entity.ends ?? [];
  if (ends.length < 2) return [];

  // By convention: end with iri === null is domain, end with iri !== null is range.
  const [domainEnd, rangeEnd] = ends[0].iri === null ? [ends[0], ends[1]] : [ends[1], ends[0]];

  const domainClassId = domainEnd?.concept ?? null;
  const rangeClassId = rangeEnd?.concept ?? null;

  if (!domainClassId || !rangeClassId) return [];

  const domainProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, domainClassId);
  const rangeProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, rangeClassId);

  if (domainProfiles.length === 0 || rangeProfiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];
  const relName = displayName(rangeEnd?.name);

  for (const domainProfile of domainProfiles) {
    for (const rangeProfile of rangeProfiles) {
      proposals.push({
        label: `Create relationship profile "${relName}" (domain: ${domainProfile.id}, range: ${rangeProfile.id})`,
        operations: [
          factory.createRelationshipProfile({
            ends: [
              {
                iri: null,
                concept: domainProfile.id,
                cardinality: domainEnd?.cardinality ?? null,
                name: null,
                nameFromProfiled: null,
                description: null,
                descriptionFromProfiled: null,
                usageNote: null,
                usageNoteFromProfiled: null,
                profiling: [],
                externalDocumentationUrl: null,
                tags: [],
              },
              {
                iri: null,
                concept: rangeProfile.id,
                cardinality: rangeEnd?.cardinality ?? null,
                name: null,
                nameFromProfiled: entity.id,
                description: null,
                descriptionFromProfiled: entity.id,
                usageNote: rangeEnd?.usageNote ?? null,
                usageNoteFromProfiled: entity.id,
                profiling: [entity.id],
                externalDocumentationUrl: null,
                tags: [],
              },
            ],
          }),
        ],
      });
    }
  }

  return proposals;
}

function reactToModifyRelationshipProfile(
  parentProfileModelEntities: EntityRecord,
  operation: ModifySemanticModelRelationshipProfile,
  childProfileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const relId = operation.identifier;
  const previousRel = parentProfileModelEntities[relId];
  if (!isSemanticModelRelationshipProfile(previousRel)) return [];

  const newEnds = operation.entity.ends;
  if (!newEnds) return [];

  const profiles = findRelationshipProfilesProfilingEntity(childProfileModelEntities, relId);
  if (profiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  // By convention, relationship profile ends are always stored as [domain, range].
  for (const profile of profiles) {
    proposals.push(...reactToModifyRelationshipEnds(relId, previousRel.ends, newEnds, profile, childProfileModelEntities));
  }

  return proposals;
}

function reactToModifyRelationshipEndProfile(
  parentProfileModelEntities: EntityRecord,
  operation: ModifySemanticModelRelationshipEndProfile,
  childProfileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const relId = operation.identifier;
  const previousRel = parentProfileModelEntities[relId];
  if (!isSemanticModelRelationshipProfile(previousRel)) return [];

  const profiles = findRelationshipProfilesProfilingEntity(childProfileModelEntities, relId);
  if (profiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  // By convention, the end index is preserved between a relationship profile
  // and a profile of it: 0 = domain, 1 = range.
  for (const profile of profiles) {
    proposals.push(...reactToModifyRelationshipEndChange(relId, previousRel.ends[operation.endIndex], operation.endIndex, operation.end, profile, childProfileModelEntities));
  }

  return proposals;
}

function reactToModifyRelationshipEnds(
  relId: string,
  previousEnds: SemanticModelRelationshipProfile["ends"],
  newEnds: SemanticModelRelationshipProfile["ends"],
  profile: SemanticModelRelationshipProfile,
  childProfileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const proposals: EvolutionProposal[] = [];
  for (let endIndex = 0; endIndex < newEnds.length; endIndex++) {
    const newEnd = newEnds[endIndex];
    const prevEnd = previousEnds[endIndex];
    if (newEnd === undefined) continue;
    proposals.push(...reactToModifyRelationshipEndChange(relId, prevEnd, endIndex, newEnd, profile, childProfileModelEntities));
  }
  return proposals;
}

function reactToModifyRelationshipEndChange(
  relId: string,
  prevEnd: SemanticModelRelationshipProfile["ends"][number] | undefined,
  endIndex: number,
  endChanges: Partial<SemanticModelRelationshipProfile["ends"][number]>,
  profile: SemanticModelRelationshipProfile,
  childProfileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const profileEnd = profile.ends[endIndex];
  if (!profileEnd) return [];

  const proposals: EvolutionProposal[] = [];
  const endLabel = endIndex === 0 ? "domain" : "range";

  proposals.push(
    ...reactToTrackedFieldChange({
      profileId: profile.id,
      sourceId: relId,
      fieldLabel: `${endLabel} name`,
      newValue: endChanges.name,
      oldValue: prevEnd?.name ?? null,
      currentValue: profileEnd.name,
      currentFromProfiled: profileEnd.nameFromProfiled,
      currentProfiling: profileEnd.profiling,
      buildOperation: (patch) => factory.modifyRelationshipEndProfile(profile.id, endIndex, patch),
    }),
  );

  proposals.push(
    ...reactToTrackedFieldChange({
      profileId: profile.id,
      sourceId: relId,
      fieldLabel: `${endLabel} description`,
      newValue: endChanges.description,
      oldValue: prevEnd?.description ?? null,
      currentValue: profileEnd.description,
      currentFromProfiled: profileEnd.descriptionFromProfiled,
      currentProfiling: profileEnd.profiling,
      buildOperation: (patch) =>
        factory.modifyRelationshipEndProfile(profile.id, endIndex, {
          description: patch.name,
          descriptionFromProfiled: patch.nameFromProfiled,
          profiling: patch.profiling,
        }),
    }),
  );

  proposals.push(
    ...reactToTrackedFieldChange({
      profileId: profile.id,
      sourceId: relId,
      fieldLabel: `${endLabel} usage note`,
      newValue: endChanges.usageNote,
      oldValue: prevEnd?.usageNote ?? null,
      currentValue: profileEnd.usageNote,
      currentFromProfiled: profileEnd.usageNoteFromProfiled,
      currentProfiling: profileEnd.profiling,
      buildOperation: (patch) =>
        factory.modifyRelationshipEndProfile(profile.id, endIndex, {
          usageNote: patch.name,
          usageNoteFromProfiled: patch.nameFromProfiled,
          profiling: patch.profiling,
        }),
    }),
  );

  // Cardinality: plain value, override is dropped when it matches the new one.
  if (endChanges.cardinality !== undefined && !deepEqual(endChanges.cardinality, prevEnd?.cardinality ?? null)) {
    const newCard = endChanges.cardinality ?? null;
    if (deepEqual(profileEnd.cardinality ?? null, newCard)) {
      proposals.push({
        label: `[Profile ${profile.id}] Remove ${endLabel} cardinality override (now matches profiled entity)`,
        operations: [
          factory.modifyRelationshipEndProfile(profile.id, endIndex, {
            cardinality: null,
          }),
        ],
      });
    } else {
      proposals.push({
        label: `[Profile ${profile.id}] Update ${endLabel} cardinality to [${newCard?.[0] ?? 0}..${newCard?.[1] ?? "*"}]`,
        operations: [
          factory.modifyRelationshipEndProfile(profile.id, endIndex, {
            cardinality: newCard,
          }),
        ],
      });
    }
  }

  // Tags: plain value, no inheritance tracking.
  if (endChanges.tags !== undefined && !deepEqual(endChanges.tags, prevEnd?.tags)) {
    proposals.push({
      label: `[Profile ${profile.id}] Update ${endLabel} tags`,
      operations: [
        factory.modifyRelationshipEndProfile(profile.id, endIndex, {
          tags: endChanges.tags,
        }),
      ],
    });
  }

  // Concept (class) changed — repoint to the class profile(s) of the new concept.
  if (endChanges.concept !== undefined && endChanges.concept !== prevEnd?.concept && endChanges.concept) {
    const conceptProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, endChanges.concept);
    for (const conceptProfile of conceptProfiles) {
      proposals.push({
        label: `[Profile ${profile.id}] Update ${endLabel} class to profile "${conceptProfile.id}"`,
        operations: [
          factory.modifyRelationshipEndProfile(profile.id, endIndex, {
            concept: conceptProfile.id,
          }),
        ],
      });
    }
  }

  return proposals;
}

function reactToCreateGeneralization(operation: CreateGeneralizationOperation, childProfileModelEntities: EntityRecord): EvolutionProposal[] {
  const entity = operation.entity;
  const childId = entity.child ?? null;
  const parentId = entity.parent ?? null;
  if (!childId || !parentId) return [];

  const childProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, childId);
  const parentProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, parentId);

  if (childProfiles.length === 0 || parentProfiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  for (const childProfile of childProfiles) {
    for (const parentProfile of parentProfiles) {
      proposals.push({
        label: `Create generalization in profile (child: ${childProfile.id}, parent: ${parentProfile.id})`,
        operations: [
          createGeneralization({
            child: childProfile.id,
            parent: parentProfile.id,
          }),
        ],
      });
    }
  }

  return proposals;
}

function reactToModifyGeneralization(
  parentProfileModelEntities: EntityRecord,
  operation: ModifyGeneralizationOperation,
  childProfileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const genId = operation.entity.id;
  const previousGen = parentProfileModelEntities[genId];
  if (!isSemanticModelGeneralization(previousGen)) return [];

  const oldChildProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, previousGen.child);
  const oldParentProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, previousGen.parent);

  const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
    childProfileModelEntities,
    oldChildProfiles.map((p) => p.id),
    oldParentProfiles.map((p) => p.id),
  );

  if (profileGeneralizations.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  for (const profileGen of profileGeneralizations) {
    if (operation.entity.child && operation.entity.child !== previousGen.child) {
      const newChildProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, operation.entity.child);
      for (const newChildProfile of newChildProfiles) {
        proposals.push({
          label: `Update generalization child profile to "${newChildProfile.id}"`,
          operations: [
            deleteEntity(profileGen.id),
            createGeneralization({
              child: newChildProfile.id,
              parent: profileGen.parent,
            }),
          ],
        });
      }
    }

    if (operation.entity.parent && operation.entity.parent !== previousGen.parent) {
      const newParentProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, operation.entity.parent);
      for (const newParentProfile of newParentProfiles) {
        proposals.push({
          label: `Update generalization parent profile to "${newParentProfile.id}"`,
          operations: [
            deleteEntity(profileGen.id),
            createGeneralization({
              child: profileGen.child,
              parent: newParentProfile.id,
            }),
          ],
        });
      }
    }
  }

  return proposals;
}

function reactToDeleteEntity(parentProfileModelEntities: EntityRecord, operation: DeleteEntityOperation, childProfileModelEntities: EntityRecord): EvolutionProposal[] {
  const entityId = operation.entityId;
  const entity = parentProfileModelEntities[entityId];
  const proposals: EvolutionProposal[] = [];

  if (isSemanticModelClassProfile(entity)) {
    const classProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, entityId);
    for (const profile of classProfiles) {
      // Cascade: delete relationship profiles using this class profile as domain/range
      // and generalizations referencing this class profile.
      const dependentRels = findRelationshipProfilesReferencingConcept(childProfileModelEntities, profile.id);
      const dependentGens = findGeneralizationsReferencingEntity(childProfileModelEntities, profile.id);

      const ops: ProfileOperation[] = [deleteEntity(profile.id), ...dependentRels.map((r) => deleteEntity(r.id)), ...dependentGens.map((g) => deleteEntity(g.id))];

      const cascadeNote = dependentRels.length + dependentGens.length > 0 ? ` (and ${dependentRels.length} relationship(s), ${dependentGens.length} generalization(s))` : "";

      proposals.push({
        label: `Delete class profile "${displayName(entity.name)}"${cascadeNote}`,
        operations: ops,
      });
    }
  } else if (isSemanticModelRelationshipProfile(entity)) {
    const relProfiles = findRelationshipProfilesProfilingEntity(childProfileModelEntities, entityId);
    for (const profile of relProfiles) {
      proposals.push({
        label: `Delete relationship profile (profiling ${entityId})`,
        operations: [deleteEntity(profile.id)],
      });
    }
  } else if (isSemanticModelGeneralization(entity)) {
    const childProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, entity.child);
    const parentProfiles = findClassProfilesProfilingEntity(childProfileModelEntities, entity.parent);

    const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
      childProfileModelEntities,
      childProfiles.map((p) => p.id),
      parentProfiles.map((p) => p.id),
    );

    for (const profileGen of profileGeneralizations) {
      proposals.push({
        label: `Delete generalization profile (child: ${profileGen.child}, parent: ${profileGen.parent})`,
        operations: [deleteEntity(profileGen.id)],
      });
    }
  }

  return proposals;
}

// --- Shared "tracked field" (name/description/usageNote-like) proposal logic ---

interface TrackedFieldPatch {
  name: Record<string, string> | null;
  nameFromProfiled: string | null;
  profiling: string[];
}

/**
 * Proposes freeze / adopt / unfreeze operations for a field that supports
 * inheritance via a `*FromProfiled` marker (name, description, usage note).
 *
 * - If the child currently inherits the value from the changed source,
 *   propose freezing it (keep the old value, stop inheriting).
 * - If the child has its own override that now matches the new value,
 *   propose unfreezing it (drop the override, inherit going forward).
 * - Otherwise, propose updating the override to the new value, and
 *   separately propose adopting/inheriting the new value from the source.
 */
function reactToTrackedFieldChange(args: {
  profileId: string;
  sourceId: string;
  fieldLabel: string;
  newValue: Record<string, string> | null | undefined;
  oldValue: Record<string, string> | null;
  currentValue: Record<string, string> | null;
  currentFromProfiled: string | null;
  currentProfiling: string[];
  buildOperation: (patch: TrackedFieldPatch) => ProfileOperation;
}): EvolutionProposal[] {
  const { profileId, sourceId, fieldLabel, newValue, oldValue, currentValue, currentFromProfiled, currentProfiling, buildOperation } = args;

  if (newValue === undefined || deepEqual(newValue, oldValue)) return [];

  const proposals: EvolutionProposal[] = [];

  if (currentFromProfiled === sourceId) {
    // Currently inherits this value → offer to freeze the old value instead.
    proposals.push({
      label: `[Profile ${profileId}] Keep old ${fieldLabel} (stop inheriting)`,
      operations: [
        buildOperation({
          name: oldValue,
          nameFromProfiled: null,
          profiling: currentProfiling,
        }),
      ],
    });
    return proposals;
  }

  if (currentFromProfiled) {
    // Inherits from a different entity — not affected by this change.
    return proposals;
  }

  if (deepEqual(newValue, currentValue)) {
    // Override now matches the new value → offer to drop it and inherit instead.
    proposals.push({
      label: `[Profile ${profileId}] Remove ${fieldLabel} override (matches new value, inherit from profiled entity)`,
      operations: [
        buildOperation({
          name: null,
          nameFromProfiled: sourceId,
          profiling: uniqueArray([...currentProfiling, sourceId]),
        }),
      ],
    });
    return proposals;
  }

  proposals.push({
    label: `[Profile ${profileId}] Update ${fieldLabel} to new value`,
    operations: [
      buildOperation({
        name: newValue,
        nameFromProfiled: currentFromProfiled,
        profiling: currentProfiling,
      }),
    ],
  });
  proposals.push({
    label: `[Profile ${profileId}] Inherit new ${fieldLabel} from profiled entity`,
    operations: [
      buildOperation({
        name: null,
        nameFromProfiled: sourceId,
        profiling: uniqueArray([...currentProfiling, sourceId]),
      }),
    ],
  });

  return proposals;
}

// --- Utilities ---

function findClassProfilesProfilingEntity(profileModelEntities: EntityRecord, entityId: string): SemanticModelClassProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelClassProfile)
    .filter((p) => p.profiling.includes(entityId));
}

function findRelationshipProfilesProfilingEntity(profileModelEntities: EntityRecord, entityId: string): SemanticModelRelationshipProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelRelationshipProfile)
    .filter((p) => p.ends.some((end) => end.profiling.includes(entityId)));
}

function findRelationshipProfilesReferencingConcept(profileModelEntities: EntityRecord, entityId: string): SemanticModelRelationshipProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelRelationshipProfile)
    .filter((p) => p.ends.some((end) => end.concept === entityId));
}

function findGeneralizationsReferencingEntity(profileModelEntities: EntityRecord, entityId: string): SemanticModelGeneralization[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelGeneralization)
    .filter((g) => g.child === entityId || g.parent === entityId);
}

function findGeneralizationsReferencingClassProfiles(profileModelEntities: EntityRecord, childProfileIds: string[], parentProfileIds: string[]): SemanticModelGeneralization[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelGeneralization)
    .filter((g) => childProfileIds.includes(g.child) && parentProfileIds.includes(g.parent));
}

function displayName(name: Record<string, string> | null | undefined): string {
  if (!name) return "(unnamed)";
  return Object.values(name)[0] ?? "(unnamed)";
}

function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
