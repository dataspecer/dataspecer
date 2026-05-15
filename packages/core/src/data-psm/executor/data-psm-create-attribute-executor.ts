import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
  CoreResource,
} from "../../core/index.ts";
import {
  DataPsmCreateAttribute,
  DataPsmCreateAttributeResult,
} from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmClass,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmAttribute, DataPsmClass } from "../model/index.ts";

export function executeDataPsmCreateAttribute(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateAttribute
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const owner = loadDataPsmClass(reader, operation.dataPsmOwner);
  if (owner === null) {
    return DataPsmExecutorResultFactory.missingOwner(operation.dataPsmOwner);
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("attribute");
  const result = new DataPsmAttribute(iri);
  result.dataPsmHumanLabel = operation.dataPsmHumanLabel;
  result.dataPsmHumanDescription = operation.dataPsmHumanDescription;
  result.dataPsmInterpretation = operation.dataPsmInterpretation;
  result.dataPsmTechnicalLabel = operation.dataPsmTechnicalLabel;
  result.dataPsmDatatype = operation.dataPsmDatatype;

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
    new DataPsmCreateAttributeResult(iri)
  );
}
