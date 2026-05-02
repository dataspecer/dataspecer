import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmSetInstancesHaveIdentity} from "../operation/index.ts";
import {DataPsmClass,} from "../model/index.ts";

export function executeDataPsmSetInstancesHaveIdentity(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetInstancesHaveIdentity
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
        instancesHaveIdentity: operation.instancesHaveIdentity,
      } as DataPsmClass
    ]
  );
}
