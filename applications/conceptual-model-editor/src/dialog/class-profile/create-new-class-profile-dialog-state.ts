import { VisualModel } from "@dataspecer/core-v2/visual-model";

import { ClassesContextType } from "../../context/classes-context";
import { ModelGraphContextType } from "../../context/model-context";
import { EditClassProfileDialogState } from "./edit-class-profile-dialog-controller";
import { DialogWrapper } from "../dialog-api";
import { EditClassProfileDialog } from "./edit-class-profile-dialog";
import { entityModelsMapToCmeVocabulary } from "../../dataspecer/semantic-model/semantic-model-adapter";
import { createEntityProfileStateForNewEntityProfile } from "../utilities/entity-profile-utilities";
import { configuration } from "../../application";
import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { listClassToProfiles, representUndefinedClass } from "../utilities/dialog-utilities";

export function createNewProfileClassDialogState(
  classesContext: ClassesContextType,
  graphContext: ModelGraphContextType,
  visualModel: VisualModel | null,
  language: string,
  profilesIdentifiers: EntityDsIdentifier[],
): EditClassProfileDialogState {

  const vocabularies = entityModelsMapToCmeVocabulary(
    graphContext.models, visualModel);

  const noProfile = representUndefinedClass();

  const availableProfiles = listClassToProfiles(
    classesContext, graphContext, vocabularies);

  // EntityProfileState

  const entityProfileState = createEntityProfileStateForNewEntityProfile(
    language, configuration().languagePreferences,
    vocabularies,
    availableProfiles, profilesIdentifiers, noProfile,
    configuration().nameToClassIri);

  return {
    ...entityProfileState,
  };
}

export const createNewClassProfileDialog = (
  state: EditClassProfileDialogState,
  onConfirm: (state: EditClassProfileDialogState) => void | null,
): DialogWrapper<EditClassProfileDialogState> => {
  return {
    label: "dialog.class-profile.label-create",
    component: EditClassProfileDialog,
    state,
    confirmLabel: "dialog.class-profile.ok-create",
    cancelLabel: "dialog.class-profile.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};
