import { createClass, CreatedEntityOperationResult } from "@dataspecer/core-v2/semantic-model/operations";
import { NewCmeClass } from "../model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { DataspecerError } from "../../dataspecer-error";

/**
 * @throws DataspecerError
 */
export function createCmeClass(
  model: InMemorySemanticModel,
  value: NewCmeClass,
) {
  const operation = createClass({
    iri: value.iri,
    name: value.name ?? undefined,
    description: value.description ?? undefined,
    externalDocumentationUrl: value.externalDocumentationUrl ?? null,
    order: value.order ?? undefined,
  });

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
  return {
    identifier: (result as CreatedEntityOperationResult).id,
    model: model.getId(),
  };
}
