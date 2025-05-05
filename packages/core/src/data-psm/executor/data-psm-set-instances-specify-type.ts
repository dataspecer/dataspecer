import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmSetInstancesSpecifyTypes} from "../operation/index.ts";
import {DataPsmClass,} from "../model/index.ts";

export async function executeDataPsmSetInstancesSpecifyTypes(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetInstancesSpecifyTypes
): Promise<CoreExecutorResult> {
  const resource = await reader.readResource(operation.dataPsmClass);
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
        instancesSpecifyTypes: operation.instancesSpecifyTypes,
      } as DataPsmClass
    ]
  );
}
