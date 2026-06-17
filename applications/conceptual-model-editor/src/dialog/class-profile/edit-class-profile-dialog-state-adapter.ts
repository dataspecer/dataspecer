import { NewCmeClassProfile } from "../../dataspecer/cme-model/model";
import { ClassProfileDialogState } from "./edit-class-profile-dialog-state";
import { emptyAsNull } from "../../utilities/string";

export function classProfileDialogStateToNewCmeClassProfile(
  state: ClassProfileDialogState): NewCmeClassProfile {
  return {
    model: state.model.identifier,
    profileOf: state.profiles.map(item => item.identifier),
    iri: state.iri,
    name: state.name,
    nameSource: state.overrideName ? null :
      state.nameSource.identifier ?? null,
    description: state.description,
    descriptionSource: state.overrideDescription ? null :
      state.descriptionSource.identifier ?? null,
    usageNote: state.usageNote,
    usageNoteSource: state.overrideUsageNote ? null :
      state.usageNoteSource.identifier ?? null,
    externalDocumentationUrl: emptyAsNull(state.externalDocumentationUrl),
    role: state.availableRoles.find(item => item.value === state.role)?.cme ?? null,
    order: emptyAsNull(state.order),
  }
}
