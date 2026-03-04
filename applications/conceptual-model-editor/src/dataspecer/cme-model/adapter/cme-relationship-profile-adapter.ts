import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeRelationshipProfile } from "../model";
import { asMandatoryLevel, selectDomainAndRange } from "./adapter-utilities";

export const semanticRelationshipProfileToCmeRelationshipProfile = (
  semanticModel: string,
  entity: SemanticModelRelationshipProfile,
): CmeRelationshipProfile => {
  const [domain, range] = selectDomainAndRange(entity.ends);

  return {
    model: semanticModel,
    identifier: entity.id,
    iri: range.iri,
    name: range.name ?? {},
    nameSource: range.nameFromProfiled,
    description: range.description ?? {},
    descriptionSource: range.descriptionFromProfiled,
    externalDocumentationUrl: range.externalDocumentationUrl ?? null,
    domain: domain.concept,
    domainCardinality: domain.cardinality ?? null,
    range: range.concept,
    rangeCardinality: range.cardinality ?? null,
    profileOf: range.profiling,
    usageNote: range.usageNote,
    usageNoteSource: range.usageNoteFromProfiled,
    // We use ?? [] as this may not be always there.
    mandatoryLevel: asMandatoryLevel(range.tags ?? []),
    order: range.order ?? null,
  };
};

