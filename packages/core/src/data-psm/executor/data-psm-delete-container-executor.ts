import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmDeleteContainer } from "../operation/index.ts";
import { removeFromClass } from "./data-psm-executor-utils.ts";

export function executeDataPsmDeleteContainer(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmDeleteContainer
): CoreExecutorResult {
  return removeFromClass(
    reader,
    operation.dataPsmOwner,
    operation.dataPsmContainer
  );
}
