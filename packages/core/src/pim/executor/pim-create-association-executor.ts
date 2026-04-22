import {
  CoreExecutorResult,
  CoreOperation,
  CoreResource,
  CoreResourceReader,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { PimCreateAssociation, PimCreateAssociationResult } from "../operation/index.ts";
import { PimAssociation, PimAssociationEnd, PimClass } from "../model/index.ts";
import { loadPimSchema, PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executesPimCreateAssociation(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: CoreOperation
): CoreExecutorResult {
  if (!PimCreateAssociation.is(operation)) {
    return PimExecutorResultFactory.invalidOperation();
  }

  const left = new PimAssociationEnd(createNewIdentifier("association-end"));
  left.pimPart = operation.pimAssociationEnds[0];
  const leftResult = verityAssociationEnd(
    reader,
    operation,
    left.pimPart
  );
  if (leftResult?.failed) {
    return leftResult;
  }

  const right = new PimAssociationEnd(createNewIdentifier("association-end"));
  right.pimPart = operation.pimAssociationEnds[1];
  const rightResult = verityAssociationEnd(
    reader,
    operation,
    right.pimPart
  );
  if (rightResult?.failed) {
    return leftResult;
  }

  const iri = operation.pimNewIri ?? createNewIdentifier("association");
  const result = new PimAssociation(iri);
  result.pimInterpretation = operation.pimInterpretation;
  result.pimTechnicalLabel = operation.pimTechnicalLabel;
  result.pimHumanLabel = operation.pimHumanLabel;
  result.pimHumanDescription = operation.pimHumanDescription;
  result.pimEnd = [left.iri, right.iri];
  result.pimIsOriented = operation.pimIsOriented;

  if (operation.pimAssociationEnds.length !== 2) {
    return CoreExecutorResult.createError(
      "Invalid number of ends for an association. Expected " +
        "2 given" +
        operation.pimAssociationEnds.length +
        "."
    );
  }

  const schema = loadPimSchema(reader);
  if (schema === null) {
    return PimExecutorResultFactory.missingSchema();
  }

  return CoreExecutorResult.createSuccess(
    [result, left, right],
    [
      {
        ...schema,
        pimParts: [...schema.pimParts, result.iri, left.iri, right.iri],
      } as CoreResource,
    ],
    [],
    new PimCreateAssociationResult(result.iri, [left.iri, right.iri])
  );
}

function verityAssociationEnd(
  reader: CoreResourceReader,
  operation: PimCreateAssociation,
  iri: string
): CoreExecutorResult | null {
  const resource = reader.readResource(iri);
  if (resource === null) {
    return PimExecutorResultFactory.missing(iri);
  }
  if (!PimClass.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:class");
  }
  return null;
}
