import { ModelDsIdentifier } from "@/dataspecer/entity-model";
import { SemanticModelGeneralizationProfile } from "@dataspecer/profile-model";
import { CME_PROFILE_GENERALIZATION, CmeProfileGeneralization } from "../model";

export function toCmeProfileGeneralization(
  model: ModelDsIdentifier,
  readOnly: boolean,
  value: SemanticModelGeneralizationProfile,
): CmeProfileGeneralization {
  return {
    type: [CME_PROFILE_GENERALIZATION],
    model,
    identifier: value.id,
    iri: value.iri,
    childIdentifier: value.child,
    parentIdentifier: value.parent,
    readOnly,
  }
}
