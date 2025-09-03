import { CmeSemanticClass } from "../../cme-semantic-model/model";
import { CmeSemanticClassAggregate } from "../model";

export function toCmeSemanticClassAggregate(
  next: CmeSemanticClass,
  previous: CmeSemanticClassAggregate | undefined,
): CmeSemanticClassAggregate {
  if (previous === undefined) {
    return {
      type: "cme-semantic-class-aggregate",
      identifier: next.identifier,
      dependencies: [next.identifier],
      semanticModels: [next.model],
      iri: next.iri,
      name: next.name,
      description: next.description,
      externalDocumentationUrl: next.externalDocumentationUrl,
      readOnly: next.readOnly,
    };
  } else {
    return {
      type: "cme-semantic-class-aggregate",
      identifier: previous.identifier,
      dependencies: [next.identifier, ...previous.dependencies],
      semanticModels: [next.model, ...previous.semanticModels],
      iri: next.iri,
      name: next.name ?? previous.name,
      description: next.description ?? previous.description,
      externalDocumentationUrl:
        next.externalDocumentationUrl ?? previous.externalDocumentationUrl,
      readOnly: next.readOnly || previous.readOnly,
    };
  }
}
