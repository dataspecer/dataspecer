import { EntityDsIdentifier, LanguageString } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";
import { CmeProfileAggregate } from "./cme-profile-aggregate";

export interface CmeProfileRelationshipAggregate extends CmeProfileAggregate {

  type: typeof CME_PROFILE_RELATIONSHIP_AGGREGATE;

  iri: string | null;

  name: LanguageString | null;

  nameSource: string | null;

  nameAggregate: LanguageString | null;

  description: LanguageString | null;

  descriptionSource: string | null;

  descriptionAggregate: LanguageString | null;

  profiling: string[];

  usageNote: LanguageString | null;

  usageNoteSource: string | null;

  usageNoteAggregate: LanguageString | null;

  externalDocumentationUrl: string | null;

  tags: string[];

  domain: EntityDsIdentifier;

  domainCardinality: CmeProfileCardinality | null;

  range: EntityDsIdentifier;

  rangeCardinality: CmeProfileCardinality | null;

}

export type CmeProfileCardinality = [number, number | null];

const CME_PROFILE_RELATIONSHIP_AGGREGATE =
  "cme-profile-relationship-aggregate";

export function isCmeProfileRelationship(
  what: CmeEntityAggregate | undefined | null,
): what is CmeProfileRelationshipAggregate {
  return what?.type === CME_PROFILE_RELATIONSHIP_AGGREGATE;
}
