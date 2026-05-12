import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { CmeClass } from "../model";

export const semanticClassToCmeClass = (
  semanticModel: string,
  entity: SemanticModelClass,
): CmeClass => {
  return {
    model: semanticModel,
    identifier: entity.id,
    iri: entity.iri,
    name: entity.name,
    description: entity.description,
    externalDocumentationUrl: entity.externalDocumentationUrl ?? null,
    order: entity.order ?? null,
  };
};
