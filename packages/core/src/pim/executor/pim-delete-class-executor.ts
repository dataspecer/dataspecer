import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimDeleteClass } from "../operation/index.ts";
import { PimExecutorResultFactory, loadPimSchema } from "./pim-executor-utils.ts";
import { PimAssociationEnd, PimAttribute, PimClass } from "../model/index.ts";

export function executePimDeleteClass(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimDeleteClass
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimClass);
  if (resource === null) {
    return PimExecutorResultFactory.missing(operation.pimClass);
  }

  if (!PimClass.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:class");
  }

  if (isClassUsed(reader, operation.pimClass)) {
    return CoreExecutorResult.createError("Class is used.");
  }

  const schema = loadPimSchema(reader);
  if (schema === null) {
    return PimExecutorResultFactory.missingSchema();
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...schema,
        pimParts: schema.pimParts.filter((iri) => iri !== operation.pimClass),
      } as CoreResource,
    ],
    [operation.pimClass]
  );
}

function isClassUsed(
  modelReader: CoreResourceReader,
  classIri: string
): boolean {
  for (const iri of modelReader.listResources()) {
    const resource = modelReader.readResource(iri);
    if (PimAttribute.is(resource)) {
      if (resource.pimOwnerClass === classIri) {
        return true;
      }
    } else if (PimAssociationEnd.is(resource)) {
      if (resource.pimPart === classIri) {
        return true;
      }
    }
  }
  return false;
}
