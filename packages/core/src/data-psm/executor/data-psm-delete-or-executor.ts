import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmDeleteOr} from "../operation/index.ts";
import {DataPsmExecutorResultFactory, loadDataPsmSchema, removeValue} from "./data-psm-executor-utils.ts";

export async function executeDataPsmDeleteOr(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmDeleteOr
): Promise<CoreExecutorResult> {
  const schema = await loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  // todo check if the entity is really or and is not referenced by other entities

  schema.dataPsmParts = removeValue(operation.dataPsmOr, schema.dataPsmParts);

  return CoreExecutorResult.createSuccess(
      [],
      [schema],
      [operation.dataPsmOr]
  );
}
