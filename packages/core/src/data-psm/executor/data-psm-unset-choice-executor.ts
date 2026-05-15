import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmUnsetChoice } from "../operation/index.ts";
import {
  DataPsmClass,
  DataPsmClassReference,
  DataPsmOr,
} from "../model/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";

export function executeDataPsmUnsetChoice(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmUnsetChoice
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
      "data-psm class or reference"
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmChoices: resource.dataPsmChoices.filter(ch => ch !== operation.dataPsmChoice),
      } as DataPsmOr,
    ]
  );
}
