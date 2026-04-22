import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmSetOrder } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmClass,
} from "./data-psm-executor-utils.ts";
import { DataPsmClass, DataPsmContainer } from "../model/index.ts";

export function executeDataPsmSetOrder(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetOrder
): CoreExecutorResult {
  const resourceToMove = reader.readResource(
    operation.dataPsmResourceToMove
  );
  if (resourceToMove === null) {
    return DataPsmExecutorResultFactory.missing(
      operation.dataPsmResourceToMove
    );
  }

  const owner = loadDataPsmClass(reader, operation.dataPsmOwnerClass);
  if (owner === null) {
    return DataPsmExecutorResultFactory.missingOwner(
      operation.dataPsmOwnerClass
    );
  }

  const indexToMove = owner.dataPsmParts.indexOf(
    operation.dataPsmResourceToMove
  );
  if (indexToMove === -1) {
    return CoreExecutorResult.createError(
      "Resource to move is not part of the class."
    );
  }

  const partsWithoutTheOneToMove = [
    ...owner.dataPsmParts.slice(0, indexToMove),
    ...owner.dataPsmParts.slice(indexToMove + 1),
  ];

  if (operation.dataPsmMoveAfter == null) {
    return moveToFirstPosition(owner, partsWithoutTheOneToMove, operation);
  } else {
    return moveAfter(owner, partsWithoutTheOneToMove, operation);
  }
}

function moveToFirstPosition(
  ownerClass: DataPsmClass | DataPsmContainer,
  partsWithoutTheOneToMove: string[],
  operation: DataPsmSetOrder
): CoreExecutorResult {
  const result = {
    ...ownerClass,
    dataPsmParts: [
      operation.dataPsmResourceToMove,
      ...partsWithoutTheOneToMove,
    ],
  } as DataPsmContainer;
  return CoreExecutorResult.createSuccess([], [result]);
}

function moveAfter(
  ownerClass: DataPsmClass | DataPsmContainer,
  partsWithoutTheOneToMove: string[],
  operation: DataPsmSetOrder
): CoreExecutorResult {
  const indexToMoveAfter = partsWithoutTheOneToMove.indexOf(
    operation.dataPsmMoveAfter
  );
  if (indexToMoveAfter === -1) {
    return CoreExecutorResult.createError(
      "Resource to move after is not part of the class."
    );
  }
  const result = {
    ...ownerClass,
    dataPsmParts: [
      ...partsWithoutTheOneToMove.slice(0, indexToMoveAfter + 1),
      operation.dataPsmResourceToMove,
      ...partsWithoutTheOneToMove.slice(indexToMoveAfter + 1),
    ],
  } as DataPsmContainer;

  return CoreExecutorResult.createSuccess([], [result]);
}
