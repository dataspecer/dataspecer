import {
  deleteEntity,
  createGeneralization,
  isCreateClassOperation,
  isModifyClassOperation,
  isCreateRelationshipOperation,
  isModifyRelationOperation,
  isModifyRelationEndOperation,
  isCreateGeneralizationOperation,
  isModifyGeneralizationOperation,
  isDeleteEntityOperation,
  type CreateClassOperation,
  type ModifyClassOperation,
  type CreateRelationshipOperation,
  type ModifyRelationOperation,
  type ModifyRelationEndOperation,
  type CreateGeneralizationOperation,
  type ModifyGeneralizationOperation,
  type DeleteEntityOperation,
} from "@dataspecer/core-v2/semantic-model/operations";
import {
  isSemanticModelClass,
  isSemanticModelRelationship,
  isSemanticModelGeneralization,
  type SemanticModelClass,
  type SemanticModelGeneralization,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  type SemanticModelClassProfile,
  type SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  createDefaultSemanticModelProfileOperationFactory,
} from "@dataspecer/core-v2/semantic-model/profile/operations";
import type { SemanticModel, SemanticOperation } from "@dataspecer/semantic-model";
import {
  type ProfileModel,
  type ProfileOperation,
} from "../profile-model.ts";

const factory = createDefaultSemanticModelProfileOperationFactory();

export interface EvolutionProposal {
  /** Human-readable description of this proposal. */
  label: string;
  /** Operations to execute on the profile model to apply this proposal. */
  operations: ProfileOperation[];
}

/**
 * Given a semantic model operation (before it is applied), proposes evolution
 * operations for a dependent profile model.
 *
 * The semantic model state passed in is the state BEFORE the operation is
 * applied.
 */
export function reactToSemanticModelOperation(
  semanticModel: SemanticModel,
  operation: SemanticOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  if (isCreateClassOperation(operation)) {
    return reactToCreateClass(operation, profileModel);
  }
  if (isModifyClassOperation(operation)) {
    return reactToModifyClass(semanticModel, operation, profileModel);
  }
  if (isCreateRelationshipOperation(operation)) {
    return reactToCreateRelationship(semanticModel, operation, profileModel);
  }
  if (isModifyRelationOperation(operation)) {
    return reactToModifyRelation(semanticModel, operation, profileModel);
  }
  if (isModifyRelationEndOperation(operation)) {
    return reactToModifyRelationEnd(semanticModel, operation, profileModel);
  }
  if (isCreateGeneralizationOperation(operation)) {
    return reactToCreateGeneralization(semanticModel, operation, profileModel);
  }
  if (isModifyGeneralizationOperation(operation)) {
    return reactToModifyGeneralization(semanticModel, operation, profileModel);
  }
  if (isDeleteEntityOperation(operation)) {
    return reactToDeleteEntity(semanticModel, operation, profileModel);
  }
  return [];
}


function reactToCreateClass(
  operation: CreateClassOperation,
  _profileModel: ProfileModel,
): EvolutionProposal[] {
  const entity = operation.entity;
  return [{
    label: `Create class profile for "${displayName(entity.name)}"`,
    operations: [factory.createClassProfile({
      iri: entity.iri ?? null,
      profiling: [entity.id],
      name: null,
      nameFromProfiled: entity.id,
      description: null,
      descriptionFromProfiled: entity.id,
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: entity.externalDocumentationUrl ?? null,
      tags: [],
    })],
  }];
}

function reactToModifyClass(
  semanticModel: SemanticModel,
  operation: ModifyClassOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const classId = operation.entity.id;
  const previousClass = semanticModel.getEntities()[classId];
  if (!isSemanticModelClass(previousClass)) return [];

  const profiles = findClassProfilesProfilingEntity(profileModel, classId);
  if (profiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];
  const entity = operation.entity;

  for (const profile of profiles) {
    // Name change proposals
    if (entity.name !== undefined &&
        JSON.stringify(entity.name) !== JSON.stringify(previousClass.name)) {
      const newName = entity.name;
      const oldName = previousClass.name;

      if (profile.nameFromProfiled !== null) {
        // Profile currently inherits the name → will automatically get the new name.
        // Offer to freeze the old name instead.
        proposals.push({
          label: `[Profile ${profile.id}] Keep old name "${displayName(oldName)}" (stop inheriting)`,
          operations: [factory.modifyClassProfile(profile.id, {
            name: oldName,
            nameFromProfiled: null,
          })],
        });
      } else {
        // Profile has its own name → offer to adopt the new name or start inheriting.
        proposals.push({
          label: `[Profile ${profile.id}] Update name to "${displayName(newName)}"`,
          operations: [factory.modifyClassProfile(profile.id, {
            name: newName,
          })],
        });
        proposals.push({
          label: `[Profile ${profile.id}] Inherit new name from profiled class`,
          operations: [factory.modifyClassProfile(profile.id, {
            name: null,
            nameFromProfiled: classId,
            profiling: uniqueArray([...profile.profiling, classId]),
          })],
        });
      }
    }

    // Description change proposals
    if (entity.description !== undefined &&
        JSON.stringify(entity.description) !== JSON.stringify(previousClass.description)) {
      const newDesc = entity.description;
      const oldDesc = previousClass.description;

      if (profile.descriptionFromProfiled !== null) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep old description (stop inheriting)`,
          operations: [factory.modifyClassProfile(profile.id, {
            description: oldDesc,
            descriptionFromProfiled: null,
          })],
        });
      } else {
        proposals.push({
          label: `[Profile ${profile.id}] Update description to new value`,
          operations: [factory.modifyClassProfile(profile.id, {
            description: newDesc,
          })],
        });
        proposals.push({
          label: `[Profile ${profile.id}] Inherit new description from profiled class`,
          operations: [factory.modifyClassProfile(profile.id, {
            description: null,
            descriptionFromProfiled: classId,
            profiling: uniqueArray([...profile.profiling, classId]),
          })],
        });
      }
    }

    // IRI change proposals
    if (entity.iri !== undefined && entity.iri !== previousClass.iri) {
      proposals.push({
        label: `[Profile ${profile.id}] Update profile IRI to match new class IRI "${entity.iri}"`,
        operations: [factory.modifyClassProfile(profile.id, {
          iri: entity.iri,
        })],
      });
    }

    // External documentation URL change proposals
    if (entity.externalDocumentationUrl !== undefined &&
        entity.externalDocumentationUrl !== previousClass.externalDocumentationUrl) {
      proposals.push({
        label: `[Profile ${profile.id}] Update external documentation URL`,
        operations: [factory.modifyClassProfile(profile.id, {
          externalDocumentationUrl: entity.externalDocumentationUrl ?? null,
        })],
      });
    }
  }

  return proposals;
}

function reactToCreateRelationship(
  _semanticModel: SemanticModel,
  operation: CreateRelationshipOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const entity = operation.entity;
  const ends = entity.ends ?? [];
  if (ends.length < 2) return [];

  // By convention: end with iri === null is domain, end with iri !== null is range.
  const [domainEnd, rangeEnd] = ends[0].iri === null
    ? [ends[0], ends[1]]
    : [ends[1], ends[0]];

  const domainClassId = domainEnd?.concept ?? null;
  const rangeClassId = rangeEnd?.concept ?? null;

  // Both ends must be profiled for a relationship profile to be valid.
  if (!domainClassId || !rangeClassId) return [];

  const domainProfiles = findClassProfilesProfilingEntity(profileModel, domainClassId);
  const rangeProfiles = findClassProfilesProfilingEntity(profileModel, rangeClassId);

  if (domainProfiles.length === 0 || rangeProfiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];
  const relName = displayName(entity.name ?? rangeEnd?.name);

  for (const domainProfile of domainProfiles) {
    for (const rangeProfile of rangeProfiles) {
      proposals.push({
        label: `Create relationship profile "${relName}" (domain: ${domainProfile.id}, range: ${rangeProfile.id})`,
        operations: [factory.createRelationshipProfile({
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
              iri: rangeEnd?.iri ?? null,
              concept: rangeProfile.id,
              cardinality: rangeEnd?.cardinality ?? null,
              name: null,
              nameFromProfiled: entity.id,
              description: null,
              descriptionFromProfiled: entity.id,
              usageNote: null,
              usageNoteFromProfiled: entity.id,
              profiling: [entity.id],
              externalDocumentationUrl: rangeEnd?.externalDocumentationUrl ?? null,
              tags: [],
            },
          ],
        })],
      });
    }
  }

  return proposals;
}

function reactToModifyRelation(
  semanticModel: SemanticModel,
  operation: ModifyRelationOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const relId = operation.entity.id;
  const previousRel = semanticModel.getEntities()[relId];
  if (!isSemanticModelRelationship(previousRel)) return [];

  const profiles = findRelationshipProfilesProfilingEntity(profileModel, relId);
  if (profiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];
  const newEnds = operation.entity.ends;

  // Determine which end index in the semantic model is the range end.
  const prevRangeEndIdx = previousRel.ends[0]?.iri !== null ? 0 : 1;
  const prevDomainEndIdx = prevRangeEndIdx === 0 ? 1 : 0;

  for (const profile of profiles) {
    // Profile ends: 0 = domain, 1 = range (by convention).
    const profileRangeEnd = profile.ends[1];

    if (newEnds) {
      const newRangeEnd = newEnds[prevRangeEndIdx];
      const prevRangeEnd = previousRel.ends[prevRangeEndIdx];
      const newDomainEnd = newEnds[prevDomainEndIdx];
      const prevDomainEnd = previousRel.ends[prevDomainEndIdx];

      // Name change on range end
      if (newRangeEnd?.name !== undefined &&
          JSON.stringify(newRangeEnd.name) !== JSON.stringify(prevRangeEnd?.name)) {
        const oldName = prevRangeEnd?.name ?? {};
        const newName = newRangeEnd.name;

        if (profileRangeEnd?.nameFromProfiled !== null) {
          proposals.push({
            label: `[Profile ${profile.id}] Keep old property name "${displayName(oldName)}" (stop inheriting)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              name: oldName,
              nameFromProfiled: null,
            })],
          });
        } else {
          proposals.push({
            label: `[Profile ${profile.id}] Update property name to "${displayName(newName)}"`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              name: newName,
            })],
          });
          proposals.push({
            label: `[Profile ${profile.id}] Inherit new property name from profiled`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              name: null,
              nameFromProfiled: relId,
              profiling: uniqueArray([...(profileRangeEnd?.profiling ?? []), relId]),
            })],
          });
        }
      }

      // Description change on range end
      if (newRangeEnd?.description !== undefined &&
          JSON.stringify(newRangeEnd.description) !== JSON.stringify(prevRangeEnd?.description)) {
        const oldDesc = prevRangeEnd?.description ?? {};
        const newDesc = newRangeEnd.description;

        if (profileRangeEnd?.descriptionFromProfiled !== null) {
          proposals.push({
            label: `[Profile ${profile.id}] Keep old property description (stop inheriting)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              description: oldDesc,
              descriptionFromProfiled: null,
            })],
          });
        } else {
          proposals.push({
            label: `[Profile ${profile.id}] Update property description to new value`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              description: newDesc,
            })],
          });
          proposals.push({
            label: `[Profile ${profile.id}] Inherit new property description from profiled`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              description: null,
              descriptionFromProfiled: relId,
              profiling: uniqueArray([...(profileRangeEnd?.profiling ?? []), relId]),
            })],
          });
        }
      }

      // Cardinality change on range end
      if (newRangeEnd?.cardinality !== undefined &&
          JSON.stringify(newRangeEnd.cardinality) !== JSON.stringify(prevRangeEnd?.cardinality)) {
        const newCard = newRangeEnd.cardinality ?? null;
        proposals.push({
          label: `[Profile ${profile.id}] Update cardinality to [${newCard?.[0] ?? 0}..${newCard?.[1] ?? '*'}]`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
            cardinality: newCard,
          })],
        });
      }

      // Range class concept changed
      if (newRangeEnd?.concept !== undefined &&
          newRangeEnd.concept !== prevRangeEnd?.concept &&
          newRangeEnd.concept) {
        const rangeClassProfiles = findClassProfilesProfilingEntity(profileModel, newRangeEnd.concept);
        for (const rangeClassProfile of rangeClassProfiles) {
          proposals.push({
            label: `[Profile ${profile.id}] Update range class to profile "${rangeClassProfile.id}"`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              concept: rangeClassProfile.id,
            })],
          });
        }
      }

      // Domain class concept changed
      if (newDomainEnd?.concept !== undefined &&
          newDomainEnd.concept !== prevDomainEnd?.concept &&
          newDomainEnd.concept) {
        const domainClassProfiles = findClassProfilesProfilingEntity(profileModel, newDomainEnd.concept);
        for (const domainClassProfile of domainClassProfiles) {
          proposals.push({
            label: `[Profile ${profile.id}] Update domain class to profile "${domainClassProfile.id}"`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 0, {
              concept: domainClassProfile.id,
            })],
          });
        }
      }
    }

    // IRI change on the relationship itself
    if (operation.entity.iri !== undefined && operation.entity.iri !== previousRel.iri) {
      proposals.push({
        label: `[Profile ${profile.id}] Update relationship profile range-end IRI to "${operation.entity.iri}"`,
        operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
          iri: operation.entity.iri,
        })],
      });
    }
  }

  return proposals;
}

function reactToModifyRelationEnd(
  semanticModel: SemanticModel,
  operation: ModifyRelationEndOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const relId = operation.entityId;
  const previousRel = semanticModel.getEntities()[relId];
  if (!isSemanticModelRelationship(previousRel)) return [];

  const profiles = findRelationshipProfilesProfilingEntity(profileModel, relId);
  if (profiles.length === 0) return [];

  const prevEnd = previousRel.ends[operation.endIndex];
  // Determine whether the modified end is the range end (has non-null iri).
  const isRangeEnd = prevEnd?.iri !== null;
  // In the profile relationship: range → index 1, domain → index 0.
  const profileEndIndex = isRangeEnd ? 1 : 0;

  const proposals: EvolutionProposal[] = [];
  const endChanges = operation.end;

  for (const profile of profiles) {
    const profileEnd = profile.ends[profileEndIndex];
    if (!profileEnd) continue;

    // Name change
    if (endChanges.name !== undefined &&
        JSON.stringify(endChanges.name) !== JSON.stringify(prevEnd?.name)) {
      const oldName = prevEnd?.name ?? {};
      const newName = endChanges.name;

      if (profileEnd.nameFromProfiled !== null) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep old name "${displayName(oldName)}" (stop inheriting)`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            name: oldName,
            nameFromProfiled: null,
          })],
        });
      } else {
        proposals.push({
          label: `[Profile ${profile.id}] Update name to "${displayName(newName)}"`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            name: newName,
          })],
        });
        proposals.push({
          label: `[Profile ${profile.id}] Inherit new name from profiled`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            name: null,
            nameFromProfiled: relId,
            profiling: uniqueArray([...profileEnd.profiling, relId]),
          })],
        });
      }
    }

    // Description change
    if (endChanges.description !== undefined &&
        JSON.stringify(endChanges.description) !== JSON.stringify(prevEnd?.description)) {
      const oldDesc = prevEnd?.description ?? {};
      const newDesc = endChanges.description;

      if (profileEnd.descriptionFromProfiled !== null) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep old description (stop inheriting)`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            description: oldDesc,
            descriptionFromProfiled: null,
          })],
        });
      } else {
        proposals.push({
          label: `[Profile ${profile.id}] Update description to new value`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            description: newDesc,
          })],
        });
        proposals.push({
          label: `[Profile ${profile.id}] Inherit new description from profiled`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            description: null,
            descriptionFromProfiled: relId,
            profiling: uniqueArray([...profileEnd.profiling, relId]),
          })],
        });
      }
    }

    // Cardinality change
    if (endChanges.cardinality !== undefined &&
        JSON.stringify(endChanges.cardinality) !== JSON.stringify(prevEnd?.cardinality)) {
      const newCard = endChanges.cardinality ?? null;
      const oldCard = prevEnd?.cardinality ?? null;
      proposals.push({
        label: `[Profile ${profile.id}] Update cardinality to [${newCard?.[0] ?? 0}..${newCard?.[1] ?? '*'}]`,
        operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
          cardinality: newCard,
        })],
      });
      proposals.push({
        label: `[Profile ${profile.id}] Keep old cardinality [${oldCard?.[0] ?? 0}..${oldCard?.[1] ?? '*'}]`,
        operations: [],
      });
    }

    // Concept (class) change — update the concept in the profile end
    if (endChanges.concept !== undefined &&
        endChanges.concept !== prevEnd?.concept &&
        endChanges.concept) {
      const newConceptId = endChanges.concept;
      const conceptProfiles = findClassProfilesProfilingEntity(profileModel, newConceptId);
      for (const conceptProfile of conceptProfiles) {
        proposals.push({
          label: `[Profile ${profile.id}] Update ${isRangeEnd ? 'range' : 'domain'} class to profile "${conceptProfile.id}"`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            concept: conceptProfile.id,
          })],
        });
      }
      // Also offer to keep the old concept
      if (conceptProfiles.length > 0) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep current ${isRangeEnd ? 'range' : 'domain'} class in profile`,
          operations: [],
        });
      }
    }
  }

  return proposals;
}

function reactToCreateGeneralization(
  _semanticModel: SemanticModel,
  operation: CreateGeneralizationOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const entity = operation.entity;
  const childId = entity.child ?? null;
  const parentId = entity.parent ?? null;
  if (!childId || !parentId) return [];

  const childProfiles = findClassProfilesProfilingEntity(profileModel, childId);
  const parentProfiles = findClassProfilesProfilingEntity(profileModel, parentId);

  if (childProfiles.length === 0 || parentProfiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  for (const childProfile of childProfiles) {
    for (const parentProfile of parentProfiles) {
      proposals.push({
        label: `Create generalization in profile (child: ${childProfile.id}, parent: ${parentProfile.id})`,
        operations: [createGeneralization({
          iri: entity.iri ?? null,
          child: childProfile.id,
          parent: parentProfile.id,
        })],
      });
    }
  }

  return proposals;
}

function reactToModifyGeneralization(
  semanticModel: SemanticModel,
  operation: ModifyGeneralizationOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const genId = operation.entity.id;
  const previousGen = semanticModel.getEntities()[genId];
  if (!isSemanticModelGeneralization(previousGen)) return [];

  // Find profile generalizations that connect profiles of the old child and parent.
  const oldChildProfiles = findClassProfilesProfilingEntity(profileModel, previousGen.child);
  const oldParentProfiles = findClassProfilesProfilingEntity(profileModel, previousGen.parent);

  const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
    profileModel,
    oldChildProfiles.map(p => p.id),
    oldParentProfiles.map(p => p.id),
  );

  if (profileGeneralizations.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  for (const profileGen of profileGeneralizations) {
    // Child changed
    if (operation.entity.child && operation.entity.child !== previousGen.child) {
      const newChildProfiles = findClassProfilesProfilingEntity(profileModel, operation.entity.child);
      for (const newChildProfile of newChildProfiles) {
        proposals.push({
          label: `Update generalization child profile to "${newChildProfile.id}"`,
          operations: [
            deleteEntity(profileGen.id),
            createGeneralization({
              iri: profileGen.iri,
              child: newChildProfile.id,
              parent: profileGen.parent,
            }),
          ],
        });
      }
    }

    // Parent changed
    if (operation.entity.parent && operation.entity.parent !== previousGen.parent) {
      const newParentProfiles = findClassProfilesProfilingEntity(profileModel, operation.entity.parent);
      for (const newParentProfile of newParentProfiles) {
        proposals.push({
          label: `Update generalization parent profile to "${newParentProfile.id}"`,
          operations: [
            deleteEntity(profileGen.id),
            createGeneralization({
              iri: profileGen.iri,
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

function reactToDeleteEntity(
  semanticModel: SemanticModel,
  operation: DeleteEntityOperation,
  profileModel: ProfileModel,
): EvolutionProposal[] {
  const entityId = operation.entityId;
  const entity = semanticModel.getEntities()[entityId];
  const proposals: EvolutionProposal[] = [];

  if (isSemanticModelClass(entity)) {
    const classProfiles = findClassProfilesProfilingEntity(profileModel, entityId);
    for (const profile of classProfiles) {
      // Cascade: delete relationship profiles using this class profile as domain/range
      // and generalizations referencing this class profile.
      const dependentRels = findRelationshipProfilesReferencingConcept(profileModel, profile.id);
      const dependentGens = findGeneralizationsReferencingEntity(profileModel, profile.id);

      const ops: ProfileOperation[] = [
        deleteEntity(profile.id),
        ...dependentRels.map(r => deleteEntity(r.id)),
        ...dependentGens.map(g => deleteEntity(g.id)),
      ];

      const cascadeNote = (dependentRels.length + dependentGens.length) > 0
        ? ` (and ${dependentRels.length} relationship(s), ${dependentGens.length} generalization(s))`
        : "";

      proposals.push({
        label: `Delete class profile "${displayName((entity as SemanticModelClass).name)}"${cascadeNote}`,
        operations: ops,
      });
    }
  } else if (isSemanticModelRelationship(entity)) {
    const relProfiles = findRelationshipProfilesProfilingEntity(profileModel, entityId);
    for (const profile of relProfiles) {
      proposals.push({
        label: `Delete relationship profile (profiling ${entityId})`,
        operations: [deleteEntity(profile.id)],
      });
    }
  } else if (isSemanticModelGeneralization(entity)) {
    const childProfiles = findClassProfilesProfilingEntity(profileModel, entity.child);
    const parentProfiles = findClassProfilesProfilingEntity(profileModel, entity.parent);

    const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
      profileModel,
      childProfiles.map(p => p.id),
      parentProfiles.map(p => p.id),
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

// --- Utilities ---

function findClassProfilesProfilingEntity(
  profileModel: ProfileModel,
  entityId: string,
): SemanticModelClassProfile[] {
  return Object.values(profileModel.getEntities())
    .filter(isSemanticModelClassProfile)
    .filter(p => p.profiling.includes(entityId));
}

function findRelationshipProfilesProfilingEntity(
  profileModel: ProfileModel,
  entityId: string,
): SemanticModelRelationshipProfile[] {
  return Object.values(profileModel.getEntities())
    .filter(isSemanticModelRelationshipProfile)
    .filter(p => p.ends.some(end => end.profiling.includes(entityId)));
}

function findRelationshipProfilesReferencingConcept(
  profileModel: ProfileModel,
  entityId: string,
): SemanticModelRelationshipProfile[] {
  return Object.values(profileModel.getEntities())
    .filter(isSemanticModelRelationshipProfile)
    .filter(p => p.ends.some(end => end.concept === entityId));
}

function findGeneralizationsReferencingEntity(
  profileModel: ProfileModel,
  entityId: string,
): SemanticModelGeneralization[] {
  return Object.values(profileModel.getEntities())
    .filter(isSemanticModelGeneralization)
    .filter(g => g.child === entityId || g.parent === entityId);
}

function findGeneralizationsReferencingClassProfiles(
  profileModel: ProfileModel,
  childProfileIds: string[],
  parentProfileIds: string[],
): SemanticModelGeneralization[] {
  return Object.values(profileModel.getEntities())
    .filter(isSemanticModelGeneralization)
    .filter(g =>
      childProfileIds.includes(g.child) && parentProfileIds.includes(g.parent));
}

function displayName(name: Record<string, string> | null | undefined): string {
  if (!name) return "(unnamed)";
  return Object.values(name)[0] ?? "(unnamed)";
}

function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
