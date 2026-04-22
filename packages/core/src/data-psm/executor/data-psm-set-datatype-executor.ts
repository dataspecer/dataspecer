import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmSetDatatype } from "../operation/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";
import { DataPsmAttribute } from "../model/index.ts";

export function executeDataPsmSetDatatype(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetDatatype
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmAttribute);
  if (!DataPsmAttribute.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm attribute"
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmDatatype: operation.dataPsmDatatype,
      } as CoreResource,
    ]
  );
}
