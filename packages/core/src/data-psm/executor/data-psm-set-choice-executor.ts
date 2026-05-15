import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmSetChoice } from "../operation/index.ts";
import {
  DataPsmClass,
  DataPsmClassReference,
  DataPsmOr,
} from "../model/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";

export function executeDataPsmSetChoice(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetChoice
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmOr);
  if (resource == null || !DataPsmOr.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm or"
    );
  }

  const newChoice = reader.readResource(operation.dataPsmChoice);
  if (
    newChoice == null ||
    (!DataPsmClass.is(newChoice) && !DataPsmClassReference.is(newChoice))
  ) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm class"
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmChoices: [...resource.dataPsmChoices, operation.dataPsmChoice],
      } as DataPsmOr,
    ]
  );
}
