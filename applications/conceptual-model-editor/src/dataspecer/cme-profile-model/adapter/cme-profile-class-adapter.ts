import { ModelDsIdentifier } from "@/dataspecer/entity-model";
import { SemanticModelClassProfile } from "@dataspecer/profile-model";
import { CME_PROFILE_CLASS, CmeProfileClass } from "../model";

export function toCmeProfileClass(
  model: ModelDsIdentifier,
  readOnly: boolean,
  value: SemanticModelClassProfile,
): CmeProfileClass {
  return {
    type: [CME_PROFILE_CLASS],
    model,
    identifier: value.id,
    iri: value.iri,
    name: value.name,
    nameSource: value.nameFromProfiled,
    description: value.description,
    descriptionSource: value.descriptionFromProfiled,
    profiling: value.profiling,
    usageNote: value.usageNote,
    usageNoteSource: value.usageNoteFromProfiled,
    externalDocumentationUrl: value.externalDocumentationUrl ?? null,
    tags: value.tags,
    readOnly,
  };
}
