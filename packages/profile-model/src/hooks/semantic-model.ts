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
import type { SemanticOperation } from "@dataspecer/semantic-model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import {
  type ProfileOperation,
} from "../profile-model.ts";
import { deepEqual } from "@dataspecer/utilities";

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
 * Both entity records represent the state BEFORE the operation is applied.
 */
export function reactToSemanticModelOperation(
  semanticModelEntities: EntityRecord,
  operation: SemanticOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  if (isCreateClassOperation(operation)) {
    return reactToCreateClass(operation, profileModelEntities);
  }
  if (isModifyClassOperation(operation)) {
    return reactToModifyClass(semanticModelEntities, operation, profileModelEntities);
  }
  if (isCreateRelationshipOperation(operation)) {
    return reactToCreateRelationship(semanticModelEntities, operation, profileModelEntities);
  }
  if (isModifyRelationOperation(operation)) {
    return reactToModifyRelation(semanticModelEntities, operation, profileModelEntities);
  }
  if (isModifyRelationEndOperation(operation)) {
    return reactToModifyRelationEnd(semanticModelEntities, operation, profileModelEntities);
  }
  if (isCreateGeneralizationOperation(operation)) {
    return reactToCreateGeneralization(semanticModelEntities, operation, profileModelEntities);
  }
  if (isModifyGeneralizationOperation(operation)) {
    return reactToModifyGeneralization(semanticModelEntities, operation, profileModelEntities);
  }
  if (isDeleteEntityOperation(operation)) {
    return reactToDeleteEntity(semanticModelEntities, operation, profileModelEntities);
  }
  return [];
}


function reactToCreateClass(
  operation: CreateClassOperation,
  _profileModelEntities: EntityRecord,
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
  semanticModelEntities: EntityRecord,
  operation: ModifyClassOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const classId = operation.entity.id;
  const previousClass = semanticModelEntities[classId];
  if (!isSemanticModelClass(previousClass)) return [];

  // Find all profiling children
  const profiles = findClassProfilesProfilingEntity(profileModelEntities, classId);
  if (profiles.length === 0) return [];

  const proposals: EvolutionProposal[] = [];
  const entity = operation.entity;

  for (const profile of profiles) {
    // Name change proposals
    if (entity.name !== undefined && !deepEqual(entity.name, previousClass.name)) {
      const newName = entity.name;
      const oldName = previousClass.name;

      if (profile.nameFromProfiled === classId) {
        // Profile currently inherits the name from this class → will automatically get the new name.
        // Offer to freeze the old name instead.
        proposals.push({
          label: `[Profile ${profile.id}] Keep old name "${displayName(oldName)}" (stop inheriting)`,
          operations: [factory.modifyClassProfile(profile.id, {
            name: oldName,
            nameFromProfiled: null,
          })],
        });
      } else if (!profile.nameFromProfiled) {
        // Profile has its own name.
        if (deepEqual(newName, profile.name)) {
          // New name matches the override → offer to remove the redundant override.
          proposals.push({
            label: `[Profile ${profile.id}] Remove name override (matches new name, inherit from profiled class)`,
            operations: [factory.modifyClassProfile(profile.id, {
              name: null,
              nameFromProfiled: classId,
            })],
          });
        } else {
          // Offer to adopt the new name or start inheriting.
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
      // else: nameFromProfiled points to a different entity — not affected by this change.
    }

    // Description change proposals
    if (entity.description !== undefined && !deepEqual(entity.description, previousClass.description)) {
      const newDesc = entity.description;
      const oldDesc = previousClass.description;

      if (profile.descriptionFromProfiled === classId) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep old description (stop inheriting)`,
          operations: [factory.modifyClassProfile(profile.id, {
            description: oldDesc,
            descriptionFromProfiled: null,
          })],
        });
      } else if (!profile.descriptionFromProfiled) {
        if (deepEqual(newDesc, profile.description)) {
          proposals.push({
            label: `[Profile ${profile.id}] Remove description override (matches new description, inherit from profiled class)`,
            operations: [factory.modifyClassProfile(profile.id, {
              description: null,
              descriptionFromProfiled: classId,
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
      // else: descriptionFromProfiled points to a different entity — not affected.
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
  _semanticModelEntities: EntityRecord,
  operation: CreateRelationshipOperation,
  profileModelEntities: EntityRecord,
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

  const domainProfiles = findClassProfilesProfilingEntity(profileModelEntities, domainClassId);
  const rangeProfiles = findClassProfilesProfilingEntity(profileModelEntities, rangeClassId);

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
  semanticModelEntities: EntityRecord,
  operation: ModifyRelationOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const relId = operation.entity.id;
  const previousRel = semanticModelEntities[relId];
  if (!isSemanticModelRelationship(previousRel)) return [];

  const profiles = findRelationshipProfilesProfilingEntity(profileModelEntities, relId);
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
      if (newRangeEnd?.name !== undefined && !deepEqual(newRangeEnd.name, prevRangeEnd?.name)) {
        const oldName = prevRangeEnd?.name ?? {};
        const newName = newRangeEnd.name;

        if (profileRangeEnd?.nameFromProfiled === relId) {
          proposals.push({
            label: `[Profile ${profile.id}] Keep old property name "${displayName(oldName)}" (stop inheriting)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              name: oldName,
              nameFromProfiled: null,
            })],
          });
        } else if (!profileRangeEnd?.nameFromProfiled) {
          if (deepEqual(newName, profileRangeEnd.name)) {
            proposals.push({
              label: `[Profile ${profile.id}] Remove name override (matches new name, inherit from profiled)`,
              operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
                name: null,
                nameFromProfiled: relId,
                profiling: uniqueArray([...(profileRangeEnd.profiling ?? []), relId]),
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
                profiling: uniqueArray([...(profileRangeEnd.profiling ?? []), relId]),
              })],
            });
          }
        }
        // else: nameFromProfiled points to a different entity — not affected.
      }

      // Description change on range end
      if (newRangeEnd?.description !== undefined && !deepEqual(newRangeEnd.description, prevRangeEnd?.description)) {
        const oldDesc = prevRangeEnd?.description ?? {};
        const newDesc = newRangeEnd.description;

        if (profileRangeEnd?.descriptionFromProfiled === relId) {
          proposals.push({
            label: `[Profile ${profile.id}] Keep old property description (stop inheriting)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              description: oldDesc,
              descriptionFromProfiled: null,
            })],
          });
        } else if (!profileRangeEnd?.descriptionFromProfiled) {
          if (deepEqual(newDesc, profileRangeEnd.description)) {
            proposals.push({
              label: `[Profile ${profile.id}] Remove description override (matches new description, inherit from profiled)`,
              operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
                description: null,
                descriptionFromProfiled: relId,
                profiling: uniqueArray([...(profileRangeEnd.profiling ?? []), relId]),
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
                profiling: uniqueArray([...(profileRangeEnd.profiling ?? []), relId]),
              })],
            });
          }
        }
        // else: descriptionFromProfiled points to a different entity — not affected.
      }

      // Cardinality change on range end
      if (newRangeEnd?.cardinality !== undefined && !deepEqual(newRangeEnd.cardinality, prevRangeEnd?.cardinality)) {
        const newCard = newRangeEnd.cardinality ?? null;
        if (deepEqual(profileRangeEnd?.cardinality ?? null, newCard)) {
          proposals.push({
            label: `[Profile ${profile.id}] Remove cardinality override (now matches profiled entity)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              cardinality: null,
            })],
          });
        } else {
          proposals.push({
            label: `[Profile ${profile.id}] Update cardinality to [${newCard?.[0] ?? 0}..${newCard?.[1] ?? '*'}]`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, 1, {
              cardinality: newCard,
            })],
          });
        }
      }

      // Range class concept changed
      if (newRangeEnd?.concept !== undefined &&
          newRangeEnd.concept !== prevRangeEnd?.concept &&
          newRangeEnd.concept) {
        const rangeClassProfiles = findClassProfilesProfilingEntity(profileModelEntities, newRangeEnd.concept);
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
        const domainClassProfiles = findClassProfilesProfilingEntity(profileModelEntities, newDomainEnd.concept);
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

  }

  return proposals;
}

function reactToModifyRelationEnd(
  semanticModelEntities: EntityRecord,
  operation: ModifyRelationEndOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const relId = operation.entityId;
  const previousRel = semanticModelEntities[relId];
  if (!isSemanticModelRelationship(previousRel)) return [];

  const profiles = findRelationshipProfilesProfilingEntity(profileModelEntities, relId);
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
    if (endChanges.name !== undefined && !deepEqual(endChanges.name, prevEnd?.name)) {
      const oldName = prevEnd?.name ?? {};
      const newName = endChanges.name;

      if (profileEnd.nameFromProfiled === relId) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep old name "${displayName(oldName)}" (stop inheriting)`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            name: oldName,
            nameFromProfiled: null,
          })],
        });
      } else if (!profileEnd.nameFromProfiled) {
        if (deepEqual(newName, profileEnd.name)) {
          proposals.push({
            label: `[Profile ${profile.id}] Remove name override (matches new name, inherit from profiled)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
              name: null,
              nameFromProfiled: relId,
              profiling: uniqueArray([...profileEnd.profiling, relId]),
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
      // else: nameFromProfiled points to a different entity — not affected.
    }

    // Description change
    if (endChanges.description !== undefined && !deepEqual(endChanges.description, prevEnd?.description)) {
      const oldDesc = prevEnd?.description ?? {};
      const newDesc = endChanges.description;

      if (profileEnd.descriptionFromProfiled === relId) {
        proposals.push({
          label: `[Profile ${profile.id}] Keep old description (stop inheriting)`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            description: oldDesc,
            descriptionFromProfiled: null,
          })],
        });
      } else if (!profileEnd.descriptionFromProfiled) {
        if (deepEqual(newDesc, profileEnd.description)) {
          proposals.push({
            label: `[Profile ${profile.id}] Remove description override (matches new description, inherit from profiled)`,
            operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
              description: null,
              descriptionFromProfiled: relId,
              profiling: uniqueArray([...profileEnd.profiling, relId]),
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
      // else: descriptionFromProfiled points to a different entity — not affected.
    }

    // Cardinality change
    if (endChanges.cardinality !== undefined && !deepEqual(endChanges.cardinality, prevEnd?.cardinality)) {
      const newCard = endChanges.cardinality ?? null;
      const oldCard = prevEnd?.cardinality ?? null;
      if (deepEqual(profileEnd.cardinality ?? null, newCard)) {
        proposals.push({
          label: `[Profile ${profile.id}] Remove cardinality override (now matches profiled entity)`,
          operations: [factory.modifyRelationshipEndProfile(profile.id, profileEndIndex, {
            cardinality: null,
          })],
        });
      } else {
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
    }

    // Concept (class) change — update the concept in the profile end
    if (endChanges.concept !== undefined &&
        endChanges.concept !== prevEnd?.concept &&
        endChanges.concept) {
      const newConceptId = endChanges.concept;
      const conceptProfiles = findClassProfilesProfilingEntity(profileModelEntities, newConceptId);
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
  _semanticModelEntities: EntityRecord,
  operation: CreateGeneralizationOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const entity = operation.entity;
  const childId = entity.child ?? null;
  const parentId = entity.parent ?? null;
  if (!childId || !parentId) return [];

  const childProfiles = findClassProfilesProfilingEntity(profileModelEntities, childId);
  const parentProfiles = findClassProfilesProfilingEntity(profileModelEntities, parentId);

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
  semanticModelEntities: EntityRecord,
  operation: ModifyGeneralizationOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const genId = operation.entity.id;
  const previousGen = semanticModelEntities[genId];
  if (!isSemanticModelGeneralization(previousGen)) return [];

  // Find profile generalizations that connect profiles of the old child and parent.
  const oldChildProfiles = findClassProfilesProfilingEntity(profileModelEntities, previousGen.child);
  const oldParentProfiles = findClassProfilesProfilingEntity(profileModelEntities, previousGen.parent);

  const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
    profileModelEntities,
    oldChildProfiles.map(p => p.id),
    oldParentProfiles.map(p => p.id),
  );

  if (profileGeneralizations.length === 0) return [];

  const proposals: EvolutionProposal[] = [];

  for (const profileGen of profileGeneralizations) {
    // Child changed
    if (operation.entity.child && operation.entity.child !== previousGen.child) {
      const newChildProfiles = findClassProfilesProfilingEntity(profileModelEntities, operation.entity.child);
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
      const newParentProfiles = findClassProfilesProfilingEntity(profileModelEntities, operation.entity.parent);
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
  semanticModelEntities: EntityRecord,
  operation: DeleteEntityOperation,
  profileModelEntities: EntityRecord,
): EvolutionProposal[] {
  const entityId = operation.entityId;
  const entity = semanticModelEntities[entityId];
  const proposals: EvolutionProposal[] = [];

  if (isSemanticModelClass(entity)) {
    const classProfiles = findClassProfilesProfilingEntity(profileModelEntities, entityId);
    for (const profile of classProfiles) {
      // Cascade: delete relationship profiles using this class profile as domain/range
      // and generalizations referencing this class profile.
      const dependentRels = findRelationshipProfilesReferencingConcept(profileModelEntities, profile.id);
      const dependentGens = findGeneralizationsReferencingEntity(profileModelEntities, profile.id);

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
    const relProfiles = findRelationshipProfilesProfilingEntity(profileModelEntities, entityId);
    for (const profile of relProfiles) {
      proposals.push({
        label: `Delete relationship profile (profiling ${entityId})`,
        operations: [deleteEntity(profile.id)],
      });
    }
  } else if (isSemanticModelGeneralization(entity)) {
    const childProfiles = findClassProfilesProfilingEntity(profileModelEntities, entity.child);
    const parentProfiles = findClassProfilesProfilingEntity(profileModelEntities, entity.parent);

    const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
      profileModelEntities,
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
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelClassProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelClassProfile)
    .filter(p => p.profiling.includes(entityId));
}

function findRelationshipProfilesProfilingEntity(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelRelationshipProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelRelationshipProfile)
    .filter(p => p.ends.some(end => end.profiling.includes(entityId)));
}

function findRelationshipProfilesReferencingConcept(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelRelationshipProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelRelationshipProfile)
    .filter(p => p.ends.some(end => end.concept === entityId));
}

function findGeneralizationsReferencingEntity(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelGeneralization[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelGeneralization)
    .filter(g => g.child === entityId || g.parent === entityId);
}

function findGeneralizationsReferencingClassProfiles(
  profileModelEntities: EntityRecord,
  childProfileIds: string[],
  parentProfileIds: string[],
): SemanticModelGeneralization[] {
  return Object.values(profileModelEntities)
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
