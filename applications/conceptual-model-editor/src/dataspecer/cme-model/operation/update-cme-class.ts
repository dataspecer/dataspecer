import { CmeClass } from "../model";
import { modifyClass } from "@dataspecer/core-v2/semantic-model/operations";
import { DataspecerError } from "../../dataspecer-error";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

/**
 * @throws DataspecerError
 */
export function updateCmeClass(
  model: InMemorySemanticModel,
  next: CmeClass,
) {
  const operation = modifyClass(
    next.identifier, {
      iri: next.iri,
      name: next.name ?? undefined,
      description: next.description ?? undefined,
      externalDocumentationUrl: next.externalDocumentationUrl ?? null,
      order: next.order ?? null,
    });

  const result = model.executeOperation(operation);
  if (result.success === false) {
    throw new DataspecerError("Operation execution failed.");
  }
}
