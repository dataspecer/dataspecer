import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmDeleteClassReference } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmClassReference, DataPsmSchema } from "../model/index.ts";

export function executeDataPsmDeleteClassReference(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmDeleteClassReference
): CoreExecutorResult {
  const schema: DataPsmSchema | null = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const resourceToDelete = reader.readResource(
    operation.entityId
  );
  if (!DataPsmClassReference.is(resourceToDelete)) {
    return CoreExecutorResult.createError(
      `Missing class '${operation.entityId}' to delete.`
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...schema,
        dataPsmParts: removeValue(
          operation.entityId,
          schema.dataPsmParts
        ),
      } as CoreResource,
    ],
    [operation.entityId]
  );
}

function removeValue<T>(valueToRemove: T, array: T[]): T[] {
  return array.filter((value) => value !== valueToRemove);
}
