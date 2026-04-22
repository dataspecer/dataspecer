import {
  CoreResourceReader,
  CoreExecutorResult,
  CreateNewIdentifier,
  CoreResource,
} from "../../core/index.ts";
import { PimExecutorResultFactory, loadPimSchema } from "./pim-executor-utils.ts";
import { PimDeleteAttribute } from "../operation/index.ts";

export function executePimDeleteAttribute(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: PimDeleteAttribute
): CoreExecutorResult {
  const schema = loadPimSchema(reader);
  if (schema === null) {
    return PimExecutorResultFactory.missingSchema();
  }

  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...schema,
        pimParts: schema.pimParts.filter(
          (iri) => iri !== operation.pimAttribute
        ),
      } as CoreResource,
    ],
    [operation.pimAttribute]
  );
}
