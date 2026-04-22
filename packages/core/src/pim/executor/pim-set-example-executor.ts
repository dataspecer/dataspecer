import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { PimAttribute, PimClass } from "../model/index.ts";
import { PimSetExample } from "../operation/index.ts";
import { PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executePimSetExample(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetExample
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (!PimAttribute.is(resource) && !PimClass.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:attribute");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimExample: operation.pimExample,
      } as PimAttribute | PimClass,
    ]
  );
}
