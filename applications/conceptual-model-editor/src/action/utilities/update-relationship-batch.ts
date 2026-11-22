import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { BaseEntityDialogState } from "../../dialog/base-entity/base-entity-dialog-state";
import { BaseRelationshipDialogState } from "../../dialog/base-relationship/base-relationship-dialog-state";
import { CmeOperationBatchBuilder, cmeOperations } from "../../operation";
import { CmeCreateContext } from "../../operation/operation";
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
  createContext: CmeCreateContext,
  entity: EntityDsIdentifier,
  initialState: RelationshipDialogState,
  state: RelationshipDialogState,
) {
  return new CmeOperationBatchBuilder(createContext)
    .add(cmeOperations.updateSemanticRelationship, {
      semanticModel: state.model.identifier,
      entity,
      ...relationshipDialogStateToValues(state),
    })
    .add(cmeOperations.updateSpecialization, {
      entity,
      model: state.model.identifier,
      previous: dialogSpecializationsToOperation(initialState.specializations),
      next: dialogSpecializationsToOperation(state.specializations),
    })
    .build();
}

/**
 * Batch to create a relationship from the create association
 * or create attribute dialog.
 *
 * @returns The batch and the reference of the relationship it creates.
 */
export function createCreateRelationshipBatch(
  createContext: CmeCreateContext,
  state: RelationshipDialogState,
) {
  const create = cmeOperations.createSemanticRelationship.create(createContext, {
    semanticModel: state.model.identifier,
    ...relationshipDialogStateToValues(state),
  });
  const batch = new CmeOperationBatchBuilder(createContext)
    .addArguments(create)
    .add(cmeOperations.updateSpecialization, {
      entity: create.identifier,
      model: state.model.identifier,
      previous: [],
      next: dialogSpecializationsToOperation(state.specializations),
    })
    .build();
  return {
    batch,
    created: { identifier: create.identifier, model: state.model.identifier },
  };
}

function relationshipDialogStateToValues(state: RelationshipDialogState) {
  return {
    iri: state.iri,
    name: state.name,
    description: state.description,
    domain: state.domain.identifier,
    domainCardinality: state.domainCardinality.cardinality,
    range: state.range.identifier,
    rangeCardinality: state.rangeCardinality.cardinality,
    externalDocumentationUrl: state.externalDocumentationUrl,
    order: emptyAsNull(state.order),
  };
}
