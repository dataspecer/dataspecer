import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { DataPsmDeleteInclude } from "../operation/index.ts";
import { removeFromClass } from "./data-psm-executor-utils.ts";

export function executeDataPsmDeleteInclude(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmDeleteInclude
): CoreExecutorResult {
  return removeFromClass(
    reader,
    operation.dataPsmOwner,
    operation.dataPsmInclude
  );
}
