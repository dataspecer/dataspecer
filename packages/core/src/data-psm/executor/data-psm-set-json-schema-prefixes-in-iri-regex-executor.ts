import { CoreResourceReader, CoreExecutorResult } from "../../core/index.ts";
import { DataPsmClass } from "../model/index.ts";
import { DataPsmSetJsonSchemaPrefixesInIriRegex } from "../operation/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";

export function executeDataPsmSetJsonSchemaPrefixesInIriRegex(
  reader: CoreResourceReader,
  _: any,
  operation: DataPsmSetJsonSchemaPrefixesInIriRegex
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmResource);
  if (resource === null || !DataPsmClass.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(resource, "data-psm class");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        jsonSchemaPrefixesInIriRegex: operation.jsonSchemaPrefixesInIriRegex,
      } as DataPsmClass,
    ],
    []
  );
}
