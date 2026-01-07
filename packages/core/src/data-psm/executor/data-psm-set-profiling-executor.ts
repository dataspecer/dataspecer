import { CoreExecutorResult, CoreResource, CoreResourceReader, CreateNewIdentifier } from "../../core/index.ts";
import { DataPsmResource } from "../model/index.ts";
import { DataPsmSetProfiling } from "../operation/index.ts";

export async function executeDataPsmSetProfiling(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetProfiling,
): Promise<CoreExecutorResult> {
  const resource = await reader.readResource(operation.dataPsmResource);
  if (resource == null) {
    return CoreExecutorResult.createError(`Missing data-psm resource '${operation.dataPsmResource}'.`);
  }

  if (!hasProfiling(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        profiling: operation.dataPsmProfiling ?? [],
      } as DataPsmResource,
    ],
  );
}

function hasProfiling(resource: CoreResource) {
  // todo: decide what has profiling and what not
  return true;
}
