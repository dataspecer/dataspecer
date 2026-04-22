import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { PimAttribute, PimClass } from "../model/index.ts";
import { PimSetRegex } from "../operation/index.ts";
import { PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executePimSetRegex(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetRegex
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (!PimAttribute.is(resource) && !PimClass.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:attribute | pim:class");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimRegex: operation.pimRegex,
      } as PimAttribute | PimClass,
    ]
  );
}
