import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { CME_SEMANTIC_CLASS, CmeSemanticClass } from "../model";
import { ModelDsIdentifier } from "@/dataspecer/entity-model";

export function toCmeSemanticClass(
  model: ModelDsIdentifier,
  value: SemanticModelClass,
): CmeSemanticClass {
  return {
    type: [CME_SEMANTIC_CLASS],
    model,
    identifier: value.id,
    iri: value.iri,
    name: value.name,
    description: value.description,
    externalDocumentationUrl: value.externalDocumentationUrl ?? null,
  }
}
