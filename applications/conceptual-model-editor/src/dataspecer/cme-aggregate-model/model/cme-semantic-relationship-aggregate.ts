import { EntityDsIdentifier, LanguageString } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";
import { CmeSemanticAggregate } from "./cme-semantic-aggregate";

export interface CmeSemanticRelationshipAggregate extends CmeSemanticAggregate {

  type: typeof CME_SEMANTIC_RELATIONSHIP_AGGREGATE;

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

export const CME_SEMANTIC_RELATIONSHIP_AGGREGATE =
  "cme-semantic-relationship-aggregate";

export function isCmeSemanticRelationship(
  what: CmeEntityAggregate | undefined | null,
): what is CmeSemanticRelationshipAggregate {
  return what?.type === CME_SEMANTIC_RELATIONSHIP_AGGREGATE;
}
