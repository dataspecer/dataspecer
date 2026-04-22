import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmSetIdType} from "../operation/index.ts";
import {DataPsmClass,} from "../model/index.ts";

export function executeDataPsmSetIdType(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetIdType
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.dataPsmResource}'.`
    );
  }

  if (!DataPsmClass.is(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  const newResource = {
    ...resource,

    jsonIdKeyAlias: operation.jsonIdKeyAlias,
    jsonIdRequired: operation.jsonIdRequired,
    jsonTypeKeyAlias: operation.jsonTypeKeyAlias,
    jsonTypeRequired: operation.jsonTypeRequired,
  };

  if (newResource.jsonIdKeyAlias === undefined) {
    delete newResource.jsonIdKeyAlias;
  }
  if (newResource.jsonIdRequired === undefined) {
    delete newResource.jsonIdRequired;
  }
  if (newResource.jsonTypeKeyAlias === undefined) {
    delete newResource.jsonTypeKeyAlias;
  }
  if (newResource.jsonTypeRequired === undefined) {
    delete newResource.jsonTypeRequired;
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      newResource,
    ]
  );
}