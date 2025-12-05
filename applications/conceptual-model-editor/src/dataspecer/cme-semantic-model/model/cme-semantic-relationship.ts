import { EntityDsIdentifier, LanguageString } from "../../entity-model";
import { CmeSemanticEntity } from "./cme-semantic-entity";

export interface CmeSemanticRelationship extends CmeSemanticEntity {

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  domain: EntityDsIdentifier | null;

  domainCardinality: CmeSemanticCardinality | null;

  range: EntityDsIdentifier | null;

  rangeCardinality: CmeSemanticCardinality | null;

  externalDocumentationUrl: string | null;

}

export type CmeSemanticCardinality = [number, number | null];

export const CME_SEMANTIC_RELATIONSHIP =
  "cme-semantic-relationship";

export function isCmeSemanticRelationship(
  what: CmeSemanticEntity | undefined | null,
): what is CmeSemanticRelationship {
  return what?.type.includes(CME_SEMANTIC_RELATIONSHIP) ?? false;
}
