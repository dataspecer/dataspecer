
import { VisualModel } from "@dataspecer/core-v2/visual-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isSemanticModelRelationshipUsage, SemanticModelRelationshipUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";

import { ClassesContextType } from "../../context/classes-context";
import { ModelGraphContextType } from "../../context/model-context";
import { EditAssociationProfileDialogState } from "./edit-association-profile-dialog-controller";
import { getDomainAndRange } from "../../util/relationship-utils";
import { MissingRelationshipEnds, RuntimeError } from "../../application/error";
import { createEntityProfileStateForEdit } from "../utilities/entity-profile-utilities";
import { createRelationshipProfileStateForEdit } from "../utilities/relationship-profile-utilities";
import { entityModelsMapToCmeVocabulary } from "../../dataspecer/semantic-model/semantic-model-adapter";
import { DialogWrapper } from "../dialog-api";
import { EditAssociationProfileDialog } from "./edit-association-profile-dialog";
import { listRelationshipProfileDomains, representOwlThing, representUndefinedAssociation } from "../utilities/dialog-utilities";
import { isSemanticModelRelationshipProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createLogger } from "../../application";
import { listAssociationsToProfile } from "./attribute-profile-utilities";

const LOG = createLogger(import.meta.url);

export function createEditAssociationProfileDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entityIdentifier: string,
): EditAssociationProfileDialogState {
  const entities = graphContext.aggregatorView.getEntities();

  const {rawEntity: entity, aggregatedEntity: aggregate} = entities[entityIdentifier];

  if (isSemanticModelRelationshipUsage(entity)
    && isSemanticModelRelationshipUsage(aggregate)) {
    return createEditAssociationProfileDialogStateFromUsage(
      classesContext, graphContext, visualModel, language, model,
      entity, aggregate);
  } else if (isSemanticModelRelationshipProfile(entity)
    && isSemanticModelRelationshipProfile(aggregate)) {
    return createEditAssociationProfileDialogStateFromProfile(
      classesContext, graphContext, visualModel, language, model,
      entity, aggregate);
  } else {
    LOG.invalidEntity(entityIdentifier, "Invalid type.", {entity, aggregate});
    throw new RuntimeError("Invalid entity type.");
  }

}

export function createEditAssociationProfileDialogStateFromUsage(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipUsage,
  aggregate: SemanticModelRelationshipUsage,
): EditAssociationProfileDialogState {

  const vocabularies = entityModelsMapToCmeVocabulary(
    graphContext.models, visualModel);

  const noProfile = representUndefinedAssociation();

  const availableProfiles = listAssociationsToProfile(
    classesContext, graphContext, vocabularies);

  const domains = listRelationshipProfileDomains(
    classesContext, graphContext, vocabularies);

  const ranges = domains;

  const { domain, range } = getDomainAndRange(entity);

  const { domain: aggregatedDomain, range: aggregatedRange } = getDomainAndRange(aggregate);

  if (domain === null || range === null || aggregatedDomain === null || aggregatedRange === null) {
    throw new MissingRelationshipEnds(entity);
  }

  const owlThing = representOwlThing();

  // EntityProfileState

  const entityProfileState = createEntityProfileStateForEdit(
    language, vocabularies, model.getId(),
    availableProfiles, [entity.usageOf], noProfile, range.iri ?? "",
    entity.name, entity.name === null ? entity.usageOf : null,
    entity.description, entity.description === null ? entity.usageOf : null,
    entity.usageNote, entity.usageNote === null ? entity.usageOf : null);

  // RelationshipState<EntityRepresentative>

  const relationshipProfileState = createRelationshipProfileStateForEdit(
    domain.concept ?? owlThing.identifier, domains, domain.cardinality,
    range.concept ?? owlThing.identifier, ranges, range.cardinality);

  return {
    ...entityProfileState,
    ...relationshipProfileState,
  };
}

export function createEditAssociationProfileDialogStateFromProfile(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipProfile,
  aggregate: SemanticModelRelationshipProfile,
): EditAssociationProfileDialogState {

  const vocabularies = entityModelsMapToCmeVocabulary(
    graphContext.models, visualModel);

  const noProfile = representUndefinedAssociation();

  const availableProfiles = listAssociationsToProfile(
    classesContext, graphContext, vocabularies);

  const domains = listRelationshipProfileDomains(
    classesContext, graphContext, vocabularies);

  const ranges = domains;

  const { domain, range } = getDomainAndRange(entity);

  const { domain: aggregatedDomain, range: aggregatedRange } = getDomainAndRange(aggregate);

  if (domain === null || range === null || aggregatedDomain === null || aggregatedRange === null) {
    throw new MissingRelationshipEnds(entity);
  }

  // EntityProfileState

  const entityProfileState = createEntityProfileStateForEdit(
    language, vocabularies, model.getId(),
    availableProfiles, range.profiling, noProfile, range.iri ?? "",
    range.name, range.nameFromProfiled,
    range.description, range.descriptionFromProfiled,
    range.usageNote, range.usageNoteFromProfiled);

  // RelationshipState<EntityRepresentative>

  const relationshipProfileState = createRelationshipProfileStateForEdit(
    domain.concept, domains, domain.cardinality,
    range.concept, ranges, range.cardinality);

  return {
    ...entityProfileState,
    ...relationshipProfileState,
  };
}

export const createEditAssociationProfileDialog = (
  state: EditAssociationProfileDialogState,
  onConfirm: (state: EditAssociationProfileDialogState) => void,
): DialogWrapper<EditAssociationProfileDialogState> => {
  return {
    label: "dialog.association-profile.label-edit",
    component: EditAssociationProfileDialog,
    state,
    confirmLabel: "dialog.association-profile.ok-edit",
    cancelLabel: "dialog.association-profile.cancel",
    validate: () => true,
    onConfirm: onConfirm,
    onClose: null,
  };
}
