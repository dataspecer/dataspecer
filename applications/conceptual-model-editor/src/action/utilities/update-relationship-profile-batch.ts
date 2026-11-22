import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { AssociationProfileDialogState } from "../../dialog/association-profile/edit-association-profile-dialog-state";
import { AttributeProfileDialogState } from "../../dialog/attribute-profile/edit-attribute-profile-dialog-state";
import { CmeOperationBatchBuilder, cmeOperations } from "../../operation";
import { emptyAsNull } from "../../utilities/string";
import { dialogSpecializationsToOperation } from "./specialization-adapter";

type RelationshipProfileDialogState =
  AssociationProfileDialogState | AttributeProfileDialogState;

/**
 * Batch to apply the edit association profile or edit attribute profile
 * dialog to the relationship profile.
 *
 * @param entity Edited relationship profile.
 * @param initialState State the dialog was opened with.
 * @param state State the dialog was confirmed with.
 */
export function createUpdateRelationshipProfileBatch(
  builder: CmeOperationBatchBuilder<[]>,
  entity: EntityDsIdentifier,
  initialState: RelationshipProfileDialogState,
  state: RelationshipProfileDialogState,
) {
  return builder
    .add(cmeOperations.updateProfileRelationship, {
      profileModel: state.model.identifier,
      entity,
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
      domain: state.domain.identifier,
      domainCardinality: state.overrideDomainCardinality ?
        state.domainCardinality.cardinality : null,
      range: state.range.identifier,
      rangeCardinality: state.overrideRangeCardinality ?
        state.rangeCardinality.cardinality : null,
      externalDocumentationUrl: state.externalDocumentationUrl,
      mandatoryLevel: state.availableMandatoryLevels.find(
        item => item.value === state.mandatoryLevel)?.cme ?? null,
      order: emptyAsNull(state.order),
    })
    .add(cmeOperations.updateSpecialization, {
      entity,
      model: state.model.identifier,
      previous: dialogSpecializationsToOperation(initialState.specializations),
      next: dialogSpecializationsToOperation(state.specializations),
    })
    .build();
}
