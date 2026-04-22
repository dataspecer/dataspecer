import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmSetExternalRootTypes} from "../operation/index.ts";
import {DataPsmExternalRoot,} from "../model/index.ts";

export function executeDataPsmSetExternalRootTypes(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetExternalRootTypes
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmExternalRoot);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.dataPsmExternalRoot}'.`
    );
  }

  if (!DataPsmExternalRoot.is(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmTypes: operation.dataPsmTypes,
      } as DataPsmExternalRoot,
    ]
  );
}
