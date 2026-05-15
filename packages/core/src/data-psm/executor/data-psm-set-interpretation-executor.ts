import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmSetInterpretation } from "../operation/index.ts";
import {
  DataPsmAssociationEnd,
  DataPsmAttribute,
  DataPsmClass,
  DataPsmResource,
} from "../model/index.ts";

export function executeDataPsmSetInterpretation(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetInterpretation
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.dataPsmResource}'.`
    );
  }

  if (!hasInterpretation(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmInterpretation: operation.dataPsmInterpretation,
      } as DataPsmResource,
    ]
  );
}

function hasInterpretation(resource: CoreResource) {
  return (
    DataPsmAssociationEnd.is(resource) ||
    DataPsmAttribute.is(resource) ||
    DataPsmClass.is(resource)
  );
}
