import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmSetPart } from "../operation/index.ts";
import {
  DataPsmAssociationEnd,
  DataPsmClass,
  DataPsmClassReference,
} from "../model/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";

export async function executeDataPsmSetPart(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetPart
): Promise<CoreExecutorResult> {
  const resource = await reader.readResource(operation.dataPsmAssociationEnd);
  if (resource == null || !DataPsmAssociationEnd.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm association end"
    );
  }

  const newPart = await reader.readResource(operation.dataPsmPart);
  if (
    newPart == null ||
    (!DataPsmClass.is(newPart) && !DataPsmClassReference.is(newPart))
  ) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm class or class reference"
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmPart: operation.dataPsmPart,
      } as DataPsmAssociationEnd,
    ]
  );
}
