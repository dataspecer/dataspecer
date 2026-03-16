import { NewCmeRelationship } from "../../dataspecer/cme-model/model";
import { emptyAsNull } from "../../utilities/string";
import { AssociationDialogState } from "./edit-association-dialog-state";

export function associationDialogStateToNewCmeRelationship(
  state: AssociationDialogState): NewCmeRelationship {
  return {
    model: state.model.identifier,
    name: state.name,
    description: state.description,
    iri: state.iri,
    domain: state.domain.identifier,
    domainCardinality: state.domainCardinality.cardinality,
    range: state.range.identifier,
    rangeCardinality: state.rangeCardinality.cardinality,
    externalDocumentationUrl: state.externalDocumentationUrl,
    order: emptyAsNull(state.order),
  }
}
