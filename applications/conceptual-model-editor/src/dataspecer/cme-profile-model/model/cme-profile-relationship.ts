import { EntityDsIdentifier, LanguageString } from "../../entity-model";
import { CmeProfileEntity } from "./cme-profile-entity";

export interface CmeProfileRelationship extends CmeProfileEntity {

  iri: string | null;

  name: LanguageString | null;

  nameSource: string | null;

  description: LanguageString | null;

  descriptionSource: string | null;

  profiling: string[];

  usageNote: LanguageString | null;

  usageNoteSource: string | null;

  externalDocumentationUrl: string | null;

  tags: string[];

  domain: EntityDsIdentifier;

  domainCardinality: CmeProfileCardinality | null;

  range: EntityDsIdentifier;

  rangeCardinality: CmeProfileCardinality | null;

}

export type CmeProfileCardinality = [number, number | null];

export const CME_PROFILE_RELATIONSHIP =
  "cme-Profile-relationship";

export function isCmeProfileRelationship(
  what: CmeProfileEntity | undefined | null,
): what is CmeProfileRelationship {
  return what?.type.includes(CME_PROFILE_RELATIONSHIP) ?? false;
}
