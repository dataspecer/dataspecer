import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { PimClass } from "../model/index.ts";
import { PimSetObjectExample } from "../operation/index.ts";
import { PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executePimSetObjectExample(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetObjectExample
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (!PimClass.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:class");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimObjectExample: operation.pimObjectExample,
      } as PimClass,
    ]
  );
}
