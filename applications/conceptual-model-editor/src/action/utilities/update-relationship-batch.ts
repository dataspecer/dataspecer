import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { BaseEntityDialogState } from "../../dialog/base-entity/base-entity-dialog-state";
import { BaseRelationshipDialogState } from "../../dialog/base-relationship/base-relationship-dialog-state";
import { CmeOperationBatchBuilder, cmeOperations } from "../../operation";
import { emptyAsNull } from "../../utilities/string";
import { dialogSpecializationsToOperation } from "./specialization-adapter";

type RelationshipDialogState =
  BaseEntityDialogState & BaseRelationshipDialogState<{ identifier: string }>;

/**
 * Batch to apply the edit association or edit attribute dialog
 * to the relationship.
 *
 * @param entity Edited relationship.
 * @param initialState State the dialog was opened with.
 * @param state State the dialog was confirmed with.
 */
export function createUpdateRelationshipBatch(
  builder: CmeOperationBatchBuilder<[]>,
  entity: EntityDsIdentifier,
  initialState: RelationshipDialogState,
  state: RelationshipDialogState,
) {
  return builder
    .add(cmeOperations.updateSemanticRelationship, {
      semanticModel: state.model.identifier,
      entity,
      iri: state.iri,
      name: state.name,
      description: state.description,
      domain: state.domain.identifier,
      domainCardinality: state.domainCardinality.cardinality,
      range: state.range.identifier,
      rangeCardinality: state.rangeCardinality.cardinality,
      externalDocumentationUrl: state.externalDocumentationUrl,
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
