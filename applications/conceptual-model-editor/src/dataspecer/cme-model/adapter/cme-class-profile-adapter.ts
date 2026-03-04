import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeClassProfile } from "../model";
import { asRole } from "./adapter-utilities";

export const semanticClassProfileToCmeClassProfile = (
  semanticModel: string,
  entity: SemanticModelClassProfile,
): CmeClassProfile => {
  return {
    model: semanticModel,
    identifier: entity.id,
    iri: entity.iri,
    name: entity.name,
    nameSource: entity.nameFromProfiled,
    description: entity.description,
    descriptionSource: entity.descriptionFromProfiled,
    externalDocumentationUrl: entity.externalDocumentationUrl ?? null,
    profileOf: entity.profiling,
    usageNote: entity.usageNote,
    usageNoteSource: entity.usageNoteFromProfiled,
    // We use ?? [] as this may not be always there.
    role: asRole(entity.tags ?? []),
    order: entity.order ?? null,
  };
};
