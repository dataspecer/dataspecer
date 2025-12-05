import { SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { CME_SEMANTIC_GENERALIZATION, CmeSemanticGeneralization } from "../model";
import { ModelDsIdentifier } from "@/dataspecer/entity-model";

export function toCmeSemanticGeneralization(
  model: ModelDsIdentifier,
  readOnly: boolean,
  value: SemanticModelGeneralization,
): CmeSemanticGeneralization {
  return {
    type: [CME_SEMANTIC_GENERALIZATION],
    model,
    identifier: value.id,
    iri: value.iri,
    childIdentifier: value.child,
    parentIdentifier: value.parent,
    readOnly,
  }
}
