import { LanguageString } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";
import { CmeSemanticAggregate } from "./cme-semantic-aggregate";

export interface CmeSemanticClassAggregate extends CmeSemanticAggregate {

  type: typeof CME_SEMANTIC_CLASS_AGGREGATE;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

}

const CME_SEMANTIC_CLASS_AGGREGATE =
  "cme-semantic-class-aggregate";

export function isCmeSemanticClassAggregate(
  what: CmeEntityAggregate | undefined | null,
): what is CmeSemanticClassAggregate {
  return what?.type === CME_SEMANTIC_CLASS_AGGREGATE;
}
