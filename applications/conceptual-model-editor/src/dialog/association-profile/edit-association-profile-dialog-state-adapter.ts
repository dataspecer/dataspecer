import { NewCmeRelationshipProfile } from "../../dataspecer/cme-model/model";
import { AssociationProfileDialogState } from "./edit-association-profile-dialog-state";

export function associationProfileDialogStateToNewCmeRelationshipProfile(
  state: AssociationProfileDialogState): NewCmeRelationshipProfile {
  return {
    model: state.model.dsIdentifier,
    profileOf: state.profiles.map(item => item.identifier),
    name: state.name,
    nameSource: state.overrideName ? null :
      state.nameSource.identifier ?? null,
    description: state.description,
    descriptionSource: state.overrideDescription ? null :
      state.descriptionSource.identifier ?? null,
    iri: state.iri,
    usageNote: state.usageNote,
    usageNoteSource: state.overrideUsageNote ? null :
      state.usageNoteSource.identifier ?? null,
    //
    domain: state.domain.identifier,
    domainCardinality:
      state.overrideDomainCardinality ?
        state.domainCardinality.cardinality : null,
    range: state.range.identifier,
    rangeCardinality:
      state.overrideRangeCardinality ?
        state.rangeCardinality.cardinality : null,
    //
    externalDocumentationUrl: state.externalDocumentationUrl,
    mandatoryLevel: state.availableMandatoryLevels.find(
      item => item.value === state.mandatoryLevel)?.cme ?? null,
  }
}
