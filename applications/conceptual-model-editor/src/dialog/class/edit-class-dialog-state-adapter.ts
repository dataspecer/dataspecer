import { NewCmeClass } from "../../dataspecer/cme-model/model";
import { emptyAsNull } from "../../utilities/string";
import { ClassDialogState } from "./edit-class-dialog-state";

export function classDialogStateToNewCmeClass(
  state: ClassDialogState): NewCmeClass {
  return {
    model: state.model.identifier,
    name: state.name,
    description: state.description,
    iri: state.iri,
    externalDocumentationUrl: emptyAsNull(state.externalDocumentationUrl),
    order: emptyAsNull(state.order),
  }
}
