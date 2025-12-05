import { VisualModel, WritableVisualModel } from "@dataspecer/visual-model";
import { EntityModel } from "@dataspecer/core-v2";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  SemanticModelEntity,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { getDomainAndRange } from "../util/relationship-utils";
import { findSourceModelOfEntity } from "../service/model-service";
import { addSemanticGeneralizationToVisualModelAction } from "./add-generalization-to-visual-model";
import { addSemanticRelationshipToVisualModelAction } from "./add-relationship-to-visual-model";
import { addSemanticRelationshipProfileToVisualModelAction } from "./add-relationship-profile-to-visual-model";
import { ModelGraphContextType } from "../context/model-context";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createVisualModelOperationExecutor } from "@/dataspecer/visual-model/visual-model-operation-executor";

/**
 * For given entity make sure, that all related entities
 * are added to the visual model.
 *
 * For example when a second end of relationship is added to the visual model,
 * this function also add the relationship.
 */
export function addRelatedEntitiesAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  entities: AggregatedEntityWrapper[],
  models: Map<string, EntityModel>,
  entity: SemanticModelEntity,
) {
  const identifier = entity.id;
  const entityModel = findSourceModelOfEntity(identifier, models);
  if (entityModel === null) {
    return;
  }

  const visualOperationExecutor = createVisualModelOperationExecutor(visualModel);

  const addingProfile = isSemanticModelClassProfile(entity);
  for (const wrapper of entities) {
    const candidate = wrapper.aggregatedEntity;
    if (candidate === null) {
      continue;
    }
    const candidateModel = findSourceModelOfEntity(candidate.id, models);
    if (candidateModel === null) {
      continue;
    }
    //
    if (isSemanticModelGeneralization(candidate)) {
      if (shouldAddGeneralization(visualModel, identifier, candidate)) {
        addSemanticGeneralizationToVisualModelAction(
          notifications, graph, visualModel, candidate.id, candidateModel.getId());
      }
    }
    if (isSemanticModelRelationship(candidate)) {
      if (shouldAddRelationship(visualModel, identifier, candidate)) {
        addSemanticRelationshipToVisualModelAction(
          notifications, graph, visualModel, candidate.id, candidateModel.getId());
      }
    }
    if (isSemanticModelRelationshipProfile(candidate)) {
      if (shouldAddRelationshipUsageOrProfile(visualModel, identifier, candidate)) {
        addSemanticRelationshipProfileToVisualModelAction(
          notifications, graph, visualModel, candidate.id, candidateModel.getId());
      }
    }
    if (isSemanticModelClassProfile(candidate)) {
      if (shouldAddProfile(visualModel, identifier, candidate)) {
        // "candidate" is profile of "entity"
        visualOperationExecutor.tryAddProfile({
          identifier: candidate.id,
          model: candidateModel.getId(),
        }, {
          identifier: entity.id,
          model: entityModel.getId(),
        });
      } else if (addingProfile && shouldAddProfile(visualModel, candidate.id, entity)) {
        // "entity" is profile of "candidate"
        visualOperationExecutor.tryAddProfile({
          identifier: entity.id,
          model: entityModel.getId(),
        }, {
          identifier: candidate.id,
          model: candidateModel.getId(),
        });
      }
    }
    if (addingProfile && isSemanticModelClass(candidate)) {
      // We are adding profile, candidate is a class, it could profiled class.
      if (entity.profiling.includes(candidate.id)) {
        // "entity" is profile of "candidate"
        visualOperationExecutor.tryAddProfile({
          identifier: entity.id,
          model: entityModel.getId(),
        }, {
          identifier: candidate.id,
          model: candidateModel.getId(),
        });
      }
    }
  }
}

function shouldAddGeneralization(
  visualModel: VisualModel,
  identifier: string,
  candidate: SemanticModelGeneralization,
): boolean {
  if (candidate.parent === identifier) {
    return visualModel.hasVisualEntityForRepresented(candidate.child);
  } else if (candidate.child === identifier) {
    return visualModel.hasVisualEntityForRepresented(candidate.parent);
  } else {
    return false;
  }
}

function shouldAddRelationship(
  visualModel: VisualModel,
  identifier: string,
  candidate: SemanticModelRelationship,
): boolean {
  const { domain, range } = getDomainAndRange(candidate);
  if (domain?.concept === identifier) {
    const other = range?.concept ?? null;
    return other !== null && visualModel.hasVisualEntityForRepresented(other);
  } else if (range?.concept === identifier) {
    const other = domain?.concept ?? null;
    return other !== null && visualModel.hasVisualEntityForRepresented(other);
  } else {
    return false;
  }
}

function shouldAddRelationshipUsageOrProfile(
  visualModel: VisualModel,
  identifier: string,
  candidate: SemanticModelRelationshipProfile,
): boolean {
  const { domain, range } = getDomainAndRange(candidate);
  if (domain?.concept === identifier) {
    const other = range?.concept ?? null;
    return other !== null && visualModel.hasVisualEntityForRepresented(other);
  } else if (range?.concept === identifier) {
    const other = domain?.concept ?? null;
    return other !== null && visualModel.hasVisualEntityForRepresented(other);
  } else {
    return false;
  }
}

function shouldAddProfile(
  visualModel: VisualModel,
  profiled: string,
  profile: SemanticModelClassProfile,
): boolean {
  if (profile.id === profiled) {
    // We do not support self profiles.
    return false;
  }
  // The candidate may be specialization of what we are adding.
  if (profile.profiling.includes(profiled)) {
    // We return true if the other is in the visual model.
    return visualModel.hasVisualEntityForRepresented(profile.id);
  }
  return false;
}
