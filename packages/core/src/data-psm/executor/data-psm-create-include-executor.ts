import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
  CoreResource,
} from "../../core/index.ts";
import {
  DataPsmCreateInclude,
  DataPsmCreateIncludeResult,
} from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmClass,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmClass, DataPsmInclude } from "../model/index.ts";

export async function executeDataPsmCreateInclude(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateInclude
): Promise<CoreExecutorResult> {
  const schema = await loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const owner = await loadDataPsmClass(reader, operation.dataPsmOwner);
  if (owner === null) {
    return DataPsmExecutorResultFactory.missingOwner(operation.dataPsmOwner);
  }

  const includes = await loadDataPsmClass(reader, operation.dataPsmIncludes);
  if (includes === null) {
    return CoreExecutorResult.createError(
        `Missing data-psm included class: '${operation.dataPsmIncludes}'.`
    );
  }

  // todo: validate whether the included class is an ancestor-or-self of the
  // owner class.

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("include");
  const result = new DataPsmInclude(iri);
  result.dataPsmIncludes = operation.dataPsmIncludes;

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
    new DataPsmCreateIncludeResult(iri)
  );
}
