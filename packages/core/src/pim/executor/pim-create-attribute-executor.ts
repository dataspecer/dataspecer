import { PimCreateAttribute, PimCreateAttributeResult } from "../operation/index.ts";
import { PimAttribute, PimClass } from "../model/index.ts";
import {
  CoreExecutorResult,
  CoreResource,
  CoreResourceReader,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { loadPimSchema, PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executePimCreateAttribute(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimCreateAttribute
): CoreExecutorResult {
  const schema = loadPimSchema(reader);
  if (schema === null) {
    return PimExecutorResultFactory.missingSchema();
  }

  const owner = reader.readResource(operation.pimOwnerClass);
  if (!PimClass.is(owner)) {
    return PimExecutorResultFactory.invalidType(owner, "pim:class");
  }

  const iri = operation.pimNewIri ?? createNewIdentifier("attribute");
  const result = new PimAttribute(iri);
  result.pimInterpretation = operation.pimInterpretation;
  result.pimTechnicalLabel = operation.pimTechnicalLabel;
  result.pimHumanLabel = operation.pimHumanLabel;
  result.pimHumanDescription = operation.pimHumanDescription;
  result.pimOwnerClass = operation.pimOwnerClass;
  result.pimDatatype = operation.pimDatatype;
  result.pimCardinalityMin = operation.pimCardinalityMin;
  result.pimCardinalityMax = operation.pimCardinalityMax;

  return CoreExecutorResult.createSuccess(
    [result],
    [
      {
        ...schema,
        pimParts: [...schema.pimParts, result.iri],
      } as CoreResource,
    ],
    [],
    new PimCreateAttributeResult(result.iri)
  );
}
