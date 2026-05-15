import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmCreateClass } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmClass } from "../model/index.ts";

export function executeDataPsmCreateClass(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateClass
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  for (const iri of operation.dataPsmExtends) {
    const resource = reader.readResource(iri);
    if (!DataPsmClass.is(resource)) {
      return CoreExecutorResult.createError(`Missing extended class: '${iri}'`);
    }
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("class");
  const result = new DataPsmClass(iri);
  result.dataPsmHumanLabel = operation.dataPsmHumanLabel;
  result.dataPsmHumanDescription = operation.dataPsmHumanDescription;
  result.dataPsmInterpretation = operation.dataPsmInterpretation;
  result.dataPsmTechnicalLabel = operation.dataPsmTechnicalLabel;
  result.dataPsmExtends = operation.dataPsmExtends;
  result.dataPsmParts = [];
  result.dataPsmIsClosed = operation.dataPsmIsClosed;

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
