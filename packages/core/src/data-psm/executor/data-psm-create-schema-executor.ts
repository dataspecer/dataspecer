import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
} from "../../core/index.ts";
import { DataPsmCreateSchema } from "../operation/index.ts";
import { DataPsmSchema } from "../model/index.ts";
import { loadDataPsmSchema } from "./data-psm-executor-utils.ts";

export function executeDataPsmCreateSchema(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateSchema
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema !== null) {
    return CoreExecutorResult.createError(
      `Schema already exists '${schema.iri}'.`
    );
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("schema");
  const result = new DataPsmSchema(iri);
  result.dataPsmHumanLabel = operation.dataPsmHumanLabel;
  result.dataPsmHumanDescription = operation.dataPsmHumanDescription;
  result.dataPsmParts = [];
  result.dataPsmRoots = [];

  return CoreExecutorResult.createSuccess([result], []);
}
