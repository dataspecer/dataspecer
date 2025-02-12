import { VisualModel } from "@dataspecer/core-v2/visual-model";

import { ClassesContextType } from "../../context/classes-context";
import { ModelGraphContextType } from "../../context/model-context";
import { EditAssociationProfileDialogState } from "./edit-association-profile-dialog-controller";
import { listRelationshipProfileDomains, representUndefinedAssociation } from "../utilities/dialog-utilities";
import { entityModelsMapToCmeVocabulary } from "../../dataspecer/semantic-model/semantic-model-adapter";
import { createRelationshipProfileStateForNew } from "../utilities/relationship-profile-utilities";
import { EditAssociationProfileDialog } from "./edit-association-profile-dialog";
import { DialogWrapper } from "../dialog-api";
import { createEntityProfileStateForNewEntityProfile } from "../utilities/entity-profile-utilities";
import { configuration } from "../../application";
import { listAssociationsToProfile } from "./attribute-profile-utilities";
import { EntityDsIdentifier } from "../../dataspecer/entity-model";

/**
 * State represents a newly created profile for given profiled entity.
 */
export function createNewAssociationProfileDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  profilesIdentifiers: EntityDsIdentifier[],
): EditAssociationProfileDialogState {
  const vocabularies = entityModelsMapToCmeVocabulary(
    graphContext.models, visualModel);

  const noProfile = representUndefinedAssociation();

  const availableProfiles = listAssociationsToProfile(
    classesContext, graphContext, vocabularies);

  const domains = listRelationshipProfileDomains(
    classesContext, graphContext, vocabularies);

  const ranges = domains;

  // EntityProfileState

  const entityProfileState = createEntityProfileStateForNewEntityProfile(
    language, configuration().languagePreferences,
    vocabularies,
    availableProfiles, profilesIdentifiers, noProfile,
    configuration().nameToIri);

  // RelationshipState<EntityRepresentative>

  const profile = entityProfileState.profiles[0];
  const relationshipProfileState = createRelationshipProfileStateForNew(
    profile.domain,
    profile.domainCardinality.cardinality,
    domains, domains[0],
    profile.range,
    profile.rangeCardinality.cardinality,
    ranges, ranges[0]);

  return {
    ...entityProfileState,
    ...relationshipProfileState,
  };
}

export const createNewAssociationProfileDialog = (
  state: EditAssociationProfileDialogState,
  onConfirm: (state: EditAssociationProfileDialogState) => void,
): DialogWrapper<EditAssociationProfileDialogState> => {
  return {
    label: "dialog.association-profile.label-create",
    component: EditAssociationProfileDialog,
    state,
    confirmLabel: "dialog.association-profile.ok-create",
    cancelLabel: "dialog.association-profile.cancel",
    validate: () => true,
    onConfirm: onConfirm,
    onClose: null,
  };
}

