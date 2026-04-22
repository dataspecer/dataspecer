import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
} from "../../core/index.ts";
import { PimSetExtends } from "../operation/index.ts";
import { PimClass } from "../model/index.ts";
import { PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executePimSetExtends(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetExtends
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimResource);
  if (resource == null) {
    return CoreExecutorResult.createError(
      `Missing pim resource '${operation.pimResource}'.`
    );
  }

  if (!PimClass.is(resource)) {
    return CoreExecutorResult.createError("Invalid resource type.");
  }

  for (const extendsClass of operation.pimExtends) {
    const cls = reader.readResource(extendsClass);
    if (!PimClass.is(cls)) {
      return PimExecutorResultFactory.invalidType(cls, "pim:class");
    }
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimExtends: operation.pimExtends,
      } as PimClass,
    ]
  );
}
