import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmSetTechnicalLabel } from "../operation/index.ts";
import {
  DataPsmAssociationEnd,
  DataPsmAttribute,
  DataPsmExternalRoot,
  DataPsmClass,
  DataPsmSchema,
  DataPsmOr,
  DataPsmResource,
} from "../model/index.ts";

export function executeDataPsmSetTechnicalLabel(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetTechnicalLabel
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.dataPsmResource}'.`
    );
  }

  if (!hasTechnicalLabel(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmTechnicalLabel: operation.dataPsmTechnicalLabel,
      } as DataPsmResource,
    ]
  );
}

function hasTechnicalLabel(resource: CoreResource) {
  return (
    DataPsmAssociationEnd.is(resource) ||
    DataPsmAttribute.is(resource) ||
    DataPsmClass.is(resource) ||
    DataPsmSchema.is(resource) ||
    DataPsmExternalRoot.is(resource) ||
    DataPsmOr.is(resource)
  );
}
