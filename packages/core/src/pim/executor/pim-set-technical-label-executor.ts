import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimSetTechnicalLabel } from "../operation/index.ts";
import { PimAssociation, PimAttribute, PimClass, PimResource } from "../model/index.ts";

export function executePimSetTechnicalLabel(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetTechnicalLabel
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing data-psm resource '${operation.pimResource}'.`
    );
  }

  if (!hasTechnicalLabel(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimTechnicalLabel: operation.pimTechnicalLabel,
      } as PimResource,
    ]
  );
}

function hasTechnicalLabel(resource: CoreResource) {
  return (
    PimAssociation.is(resource) ||
    PimAttribute.is(resource) ||
    PimClass.is(resource)
  );
}
