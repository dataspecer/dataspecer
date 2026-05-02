import {CoreExecutorResult, CoreResource, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmDeleteExternalRoot} from "../operation/index.ts";
import {DataPsmExecutorResultFactory} from "./data-psm-executor-utils.ts";
import {DataPsmExternalRoot, DataPsmSchema} from "../model/index.ts";

export function executeDataPsmDeleteExternalRoot(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmDeleteExternalRoot
): CoreExecutorResult {
  let schema: DataPsmSchema | null = null;
  const classes: DataPsmExternalRoot[] = [];
  for (const iri of reader.listResources()) {
    const resource = reader.readResource(iri);
    if (DataPsmSchema.is(resource)) {
      schema = resource;
    }
    if (DataPsmExternalRoot.is(resource)) {
      classes.push(resource);
    }
  }

  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }


  const classToDelete = reader.readResource(operation.dataPsmExternalRoot);
  if (!DataPsmExternalRoot.is(classToDelete)) {
    return CoreExecutorResult.createError(
      `Missing class '${operation.dataPsmExternalRoot}' to delete.`
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...schema,
        dataPsmRoots: removeValue(operation.dataPsmExternalRoot, schema.dataPsmRoots),
        dataPsmParts: removeValue(operation.dataPsmExternalRoot, schema.dataPsmParts),
      } as CoreResource,
    ],
    [operation.dataPsmExternalRoot]
  );
}

function removeValue<T>(valueToRemove: T, array: T[]): T[] {
  return array.filter((value) => value !== valueToRemove);
}
