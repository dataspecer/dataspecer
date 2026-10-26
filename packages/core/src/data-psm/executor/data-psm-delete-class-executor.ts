import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmDeleteClass } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmClass,
} from "./data-psm-executor-utils.ts";
import { DataPsmClass, DataPsmSchema } from "../model/index.ts";

export function executeDataPsmDeleteClass(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmDeleteClass
): CoreExecutorResult {
  let schema: DataPsmSchema | null = null;
  const classes: DataPsmClass[] = [];
  for (const iri of reader.listResources()) {
    const resource = reader.readResource(iri);
    if (DataPsmSchema.is(resource)) {
      schema = resource;
    }
    if (DataPsmClass.is(resource)) {
      classes.push(resource);
    }
  }

  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const classToDelete = loadDataPsmClass(reader, operation.entityId);
  if (classToDelete === null) {
    return CoreExecutorResult.createError(
      `Missing class '${operation.entityId}' to delete.`
    );
  }

  if (classToDelete.dataPsmParts.length > 0) {
    return CoreExecutorResult.createError("Only empty class can be deleted.");
  }

  for (const classItem of classes) {
    if (classItem.dataPsmExtends.includes(operation.entityId)) {
      return CoreExecutorResult.createError(
        "Class is extended by other class."
      );
    }
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...schema,
        dataPsmRoots: removeValue(operation.entityId, schema.dataPsmRoots),
        dataPsmParts: removeValue(operation.entityId, schema.dataPsmParts),
      } as CoreResource,
    ],
    [operation.entityId]
  );
}

function removeValue<T>(valueToRemove: T, array: T[]): T[] {
  return array.filter((value) => value !== valueToRemove);
}
