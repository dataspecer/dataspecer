import { PimDeleteAssociation } from "../operation/index.ts";
import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimExecutorResultFactory, loadPimSchema } from "./pim-executor-utils.ts";
import { PimAssociation } from "../model/index.ts";

export function executePimDeleteAssociation(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimDeleteAssociation
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimAssociation);
  if (resource === null) {
    return PimExecutorResultFactory.missing(operation.pimAssociation);
  }

  if (!PimAssociation.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:association");
  }

  // We do not check for the ends in here, as this operation may be
  // also used to delete invalid association. We just delete all of it.
  const iriToRemove = [resource.iri, ...resource.pimEnd];

  const schema = loadPimSchema(reader);
  if (schema === null) {
    return PimExecutorResultFactory.missingSchema();
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...schema,
        pimParts: schema.pimParts.filter((iri) => !iriToRemove.includes(iri)),
      } as CoreResource,
    ],
    iriToRemove
  );
}
