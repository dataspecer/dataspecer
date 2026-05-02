import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmCreateExternalRoot } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmExternalRoot } from "../model/index.ts";

export function executeDataPsmCreateExternalRoot(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateExternalRoot
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const iri = /*operation.dataPsmNewIri ??*/ createNewIdentifier("external-root");
  const result = new DataPsmExternalRoot(iri);
  result.dataPsmTypes = operation.dataPsmTypes;
  result.dataPsmTechnicalLabel = operation.dataPsmTechnicalLabel;

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
