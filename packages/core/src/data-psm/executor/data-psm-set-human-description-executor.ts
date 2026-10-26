import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmSetHumanDescription } from "../operation/index.ts";
import {
  DataPsmAssociationEnd,
  DataPsmAttribute,
  DataPsmClass,
  DataPsmResource,
  DataPsmSchema,
} from "../model/index.ts";

export function executeDataPsmSetHumanDescription(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetHumanDescription
): CoreExecutorResult {
  const resource = reader.readResource(operation.entityId);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.entityId}'.`
    );
  }

  if (!hasHumanDescription(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmHumanDescription: operation.dataPsmHumanDescription,
      } as DataPsmResource,
    ]
  );
}

function hasHumanDescription(resource: CoreResource) {
  return (
    DataPsmAssociationEnd.is(resource) ||
    DataPsmAttribute.is(resource) ||
    DataPsmClass.is(resource) ||
    DataPsmSchema.is(resource)
  );
}
