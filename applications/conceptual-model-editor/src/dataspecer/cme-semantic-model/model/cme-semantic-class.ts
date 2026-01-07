import { LanguageString } from "../../entity-model";
import { CmeSemanticEntity } from "./cme-semantic-entity";

export interface CmeSemanticClass extends CmeSemanticEntity {

  /**
   * IRI can be absolute or relative to the model IRI.
   */
  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

}

export const CME_SEMANTIC_CLASS =
  "cme-semantic-class";

export function isCmeSemanticClass(
  what: CmeSemanticEntity | undefined | null,
): what is CmeSemanticClass {
  return what?.type.includes(CME_SEMANTIC_CLASS) ?? false;
}
