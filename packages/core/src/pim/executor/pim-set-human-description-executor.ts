import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimSetHumanDescription } from "../operation/index.ts";
import { PimAssociation, PimAttribute, PimClass, PimResource, PimSchema } from "../model/index.ts";

export function executePimSetHumanDescription(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetHumanDescription
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.pimResource}'.`
    );
  }

  if (!hasHumanDescription(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimHumanDescription: operation.pimHumanDescription,
      } as PimResource,
    ]
  );
}

function hasHumanDescription(resource: CoreResource) {
  return (
    PimAssociation.is(resource) ||
    PimAttribute.is(resource) ||
    PimClass.is(resource) ||
    PimSchema.is(resource)
  );
}
