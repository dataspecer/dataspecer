import { SemanticModelRelationshipProfile } from "@dataspecer/profile-model";
import { ModelDsIdentifier } from "../../entity-model";
import { CME_PROFILE_RELATIONSHIP, CmeProfileRelationship } from "../model";
import { selectDomainAndRange } from "../../cme-model/adapter/adapter-utilities";

export function toCmeProfileRelationship(
  model: ModelDsIdentifier,
  readOnly: boolean,
  value: SemanticModelRelationshipProfile,
): CmeProfileRelationship {
  const [domain, range] = selectDomainAndRange(value.ends);
  return {
    type: [CME_PROFILE_RELATIONSHIP],
    model,
    identifier: value.id,
    iri: range.iri,
    name: range.name,
    nameSource: range.nameFromProfiled,
    description: range.description,
    descriptionSource: range.descriptionFromProfiled,
    usageNote: range.usageNote,
    usageNoteSource: range.usageNoteFromProfiled,
    profiling: range.profiling,
    externalDocumentationUrl: range.externalDocumentationUrl ?? null,
    tags: range.tags,
    domain: domain.concept,
    domainCardinality: domain.cardinality ?? null,
    range: range.concept,
    rangeCardinality: range.cardinality ?? null,
    readOnly,
  }
}
