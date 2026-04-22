import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
  CoreResource,
} from "../../core/index.ts";
import {
  DataPsmCreateContainer,
  DataPsmCreateContainerResult,
} from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmClass,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmClass, DataPsmContainer } from "../model/index.ts";

export function executeDataPsmCreateContainer(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateContainer
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const owner = loadDataPsmClass(reader, operation.dataPsmOwner);
  if (owner === null) {
    return DataPsmExecutorResultFactory.missingOwner(operation.dataPsmOwner);
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("Container");
  const result = new DataPsmContainer(iri);
  result.dataPsmContainerType = operation.dataPsmContainerType;

  return CoreExecutorResult.createSuccess(
    [result],
    [
      {
        ...schema,
        dataPsmParts: [...schema.dataPsmParts, iri],
      } as CoreResource,
      {
        ...owner,
        dataPsmParts: [...owner.dataPsmParts, iri],
      } as DataPsmClass,
    ],
    [],
    new DataPsmCreateContainerResult(iri)
  );
}
