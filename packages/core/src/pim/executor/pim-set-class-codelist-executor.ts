import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimSetClassCodelist } from "../operation/index.ts";
import { PimClass } from "../model/index.ts";

export function executePimSetClassCodelist(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetClassCodelist
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimClass);
  if (!PimClass.is(resource)) {
    return CoreExecutorResult.createError(
      `Invalid pim class resource '${operation.pimClass}'.`
    );
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimIsCodelist: operation.pimIsCodeList,
        pimCodelistUrl: operation.pimCodelistUrl,
      } as CoreResource,
    ]
  );
}
