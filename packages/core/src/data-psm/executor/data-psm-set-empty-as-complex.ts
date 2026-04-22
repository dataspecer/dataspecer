import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmSetEmptyAsComplex } from "../operation/index.ts";
import {
  DataPsmClass,
} from "../model/index.ts";

export function executeDataPsmSetEmptyAsComplex(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetEmptyAsComplex
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
        dataPsmEmptyAsComplex: operation.dataPsmEmptyAsComplex === true,
      } as DataPsmClass,
    ]
  );
}
