import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimAttribute } from "../model/index.ts";
import { PimSetDatatype } from "../operation/index.ts";
import { PimExecutorResultFactory } from "./pim-executor-utils.ts";

export function executePimSetDataType(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimSetDatatype
): CoreExecutorResult {
  const resource = reader.readResource(operation.pimAttribute);
  if (!PimAttribute.is(resource)) {
    return PimExecutorResultFactory.invalidType(resource, "pim:attribute");
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        pimDatatype: operation.pimDatatype,
        pimLanguageStringRequiredLanguages: operation.pimLanguageStringRequiredLanguages,
      } as CoreResource,
    ]
  );
}
