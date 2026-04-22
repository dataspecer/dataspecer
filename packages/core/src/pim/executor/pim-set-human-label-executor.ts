import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimSetHumanLabel } from "../operation/index.ts";
import { PimAssociation, PimAttribute, PimClass, PimResource, PimSchema } from "../model/index.ts";

export function executePimSetHumanLabel(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetHumanLabel
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.pimResource}'.`
    );
  }

  if (!hasHumanLabel(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimHumanLabel: operation.pimHumanLabel,
      } as PimResource,
    ]
  );
}

function hasHumanLabel(resource: CoreResource) {
  return (
    PimAssociation.is(resource) ||
    PimAttribute.is(resource) ||
    PimClass.is(resource) ||
    PimSchema.is(resource)
  );
}
