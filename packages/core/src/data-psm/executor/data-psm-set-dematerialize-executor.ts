import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmSetDematerialized } from "../operation/index.ts";
import { DataPsmAssociationEnd } from "../model/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";

export function executeDataPsmSetDematerialize(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetDematerialized
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmAssociationEnd);
  if (resource == null || !DataPsmAssociationEnd.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm association end"
    );
  }
  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        dataPsmIsDematerialize: operation.dataPsmIsDematerialized,
      } as DataPsmAssociationEnd,
    ]
  );
}
