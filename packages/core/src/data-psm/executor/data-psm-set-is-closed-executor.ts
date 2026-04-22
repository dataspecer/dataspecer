import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmSetIsClosed } from "../operation/index.ts";
import {
  DataPsmClass,
} from "../model/index.ts";

export function executeDataPsmSetIsClosed(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetIsClosed
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmClass);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.dataPsmClass}'.`
    );
  }

  if (!DataPsmClass.is(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmIsClosed: operation.dataPsmIsClosed,
      } as DataPsmClass,
    ]
  );
}
