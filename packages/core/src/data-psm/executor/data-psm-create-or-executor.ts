import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
  CoreResource,
} from "../../core/index.ts";
import {
  DataPsmCreateOr,
  DataPsmCreateOrResult,
} from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmOr } from "../model/index.ts";

export function executeDataPsmCreateOr(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateOr
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("or");
  const result = new DataPsmOr(iri);

  return CoreExecutorResult.createSuccess(
    [result],
    [
      {
        ...schema,
        dataPsmParts: [...schema.dataPsmParts, iri],
      } as CoreResource,
    ],
    [],
    new DataPsmCreateOrResult(iri)
  );
}
