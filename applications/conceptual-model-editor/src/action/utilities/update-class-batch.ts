import { VisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { ClassDialogState } from "../../dialog/class/edit-class-dialog-state";
import { CmeOperationBatchBuilder, cmeOperations } from "../../operation";
import { CmeCreateContext, CmeOperationArguments } from "../../operation/operation";
import { emptyAsNull } from "../../utilities/string";
import { dialogSpecializationsToOperation } from "./specialization-adapter";

/**
 * Batch to apply the edit class dialog to the class.
 * Generalizations created or removed by the dialog are shown
 * or hidden in the visual model, when it is writable.
 *
 * @param entity Edited class.
 * @param initialState State the dialog was opened with.
 * @param state State the dialog was confirmed with.
 */
export function createUpdateClassBatch(
  createContext: CmeCreateContext,
  visualModel: VisualModel | null,
  entity: EntityDsIdentifier,
  initialState: ClassDialogState,
  state: ClassDialogState,
) {
  const specialization = cmeOperations.updateSpecialization.create(createContext, {
    entity,
    model: state.model.identifier,
    previous: dialogSpecializationsToOperation(initialState.specializations),
    next: dialogSpecializationsToOperation(state.specializations),
  });

  let builder: CmeOperationBatchBuilder<CmeOperationArguments[]> =
    new CmeOperationBatchBuilder(createContext)
    .add(cmeOperations.updateSemanticClass, {
      semanticModel: state.model.identifier,
      entity,
      ...classDialogStateToValues(state),
    })
    .addArguments(specialization);

  if (!isWritableVisualModel(visualModel)) {
    return builder.build();
  }

  if (specialization.removed.length > 0) {
    builder = builder.add(cmeOperations.hideByRepresented, {
      visualModel: visualModel.getIdentifier(),
      entities: specialization.removed.map(item => item.identifier),
    });
  }
  for (const item of specialization.created) {
    builder = builder.add(cmeOperations.showGeneralization, {
      visualModel: visualModel.getIdentifier(),
      entity: item.identifier,
    });
  }
  return builder.build();
}

/**
 * Batch to create a class from the create class dialog.
 *
 * @returns The batch and the reference of the class it creates.
 */
export function createCreateClassBatch(
  createContext: CmeCreateContext,
  state: ClassDialogState,
) {
  const create = cmeOperations.createSemanticClass.create(createContext, {
    semanticModel: state.model.identifier,
    ...classDialogStateToValues(state),
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

function classDialogStateToValues(state: ClassDialogState) {
  return {
    iri: state.iri,
    name: state.name,
    description: state.description,
    externalDocumentationUrl: emptyAsNull(state.externalDocumentationUrl),
    order: emptyAsNull(state.order),
  };
}
