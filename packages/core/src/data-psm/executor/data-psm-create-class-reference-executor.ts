import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmCreateClassReference } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmClassReference } from "../model/index.ts";

export function executeDataPsmCreateClassReference(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateClassReference
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("class-reference");
  const result = new DataPsmClassReference(iri);
  result.dataPsmSpecification = operation.dataPsmSpecification;
  result.dataPsmClass = operation.dataPsmClass;

  return CoreExecutorResult.createSuccess(
    [result],
    [
      {
        ...schema,
        dataPsmParts: [...schema.dataPsmParts, iri],
      } as CoreResource,
    ]
  );
}
