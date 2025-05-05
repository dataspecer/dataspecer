import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { PimAssociationEnd, PimAttribute } from "../model/index.ts";
import { PimExecutorResultFactory } from "./pim-executor-utils.ts";
import { PimSetCardinality } from "../operation/index.ts";

export async function executePimSetCardinality(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetCardinality
): Promise<CoreExecutorResult> {
  const resource = await reader.readResource(operation.pimResource);
  if (!PimAttribute.is(resource) && !PimAssociationEnd.is(resource)) {
    return PimExecutorResultFactory.invalidType(
      resource,
      "pim:attribute, pim:associationEnd"
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimCardinalityMin: operation.pimCardinalityMin,
        pimCardinalityMax: operation.pimCardinalityMax,
      } as PimAttribute | PimAssociationEnd,
    ]
  );
}
