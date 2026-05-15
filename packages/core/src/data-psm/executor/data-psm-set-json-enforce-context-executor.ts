import { CoreExecutorResult, CoreResourceReader, CreateNewIdentifier } from "../../core/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";
import { DataPsmClass, DataPsmSchema } from "../model/index.ts";
import { DataPsmSetJsonEnforceContext } from "../operation/index.ts";

export function executeDataPsmSetJsonEnforceContext(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetJsonEnforceContext,
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmEntity);
  if (resource == null || !DataPsmSchema.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(resource, "data-psm schema");
  }

  if (operation.jsonEnforceContext === undefined) {
    const clonedResource = { ...resource } as DataPsmSchema;
    delete clonedResource.jsonEnforceContext;
    CoreExecutorResult.createSuccess([], [clonedResource]);
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        jsonEnforceContext: operation.jsonEnforceContext,
      } as DataPsmSchema | DataPsmClass,
    ],
  );
}
