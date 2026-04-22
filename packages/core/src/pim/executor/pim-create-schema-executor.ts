import { PimCreateSchema, PimCreateSchemaResult } from "../operation/index.ts";
import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
} from "../../core/index.ts";
import { loadPimSchema } from "./pim-executor-utils.ts";
import { PimSchema } from "../model/index.ts";

export function executePimCreateSchema(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimCreateSchema
): CoreExecutorResult {
  const schema = loadPimSchema(reader);
  if (schema !== null) {
    return CoreExecutorResult.createError(
      `Schema already exists '${schema.iri}'.`
    );
  }

  const iri = operation.pimNewIri ?? createNewIdentifier("schema");
  const result = new PimSchema(iri);
  result.pimHumanLabel = operation.pimHumanLabel;
  result.pimHumanDescription = operation.pimHumanDescription;

  return CoreExecutorResult.createSuccess(
    [result],
    [],
    [],
    new PimCreateSchemaResult(result.iri)
  );
}
