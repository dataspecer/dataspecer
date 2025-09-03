import { EntityDsIdentifier } from "../../entity-model";
import { CmeSemanticEntity } from "./cme-semantic-entity";

export interface CmeSemanticGeneralization extends CmeSemanticEntity {

  /**
   * We to not work with IRI in an active way, that is why we allow null.
   * See [#537](https://github.com/dataspecer/dataspecer/issues/537).
   */
  iri: string | null;

  /**
   * Generalized entity.
   */
  childIdentifier: EntityDsIdentifier;

  /**
   * Generalizing entity.
   */
  parentIdentifier: EntityDsIdentifier;

}

export const CME_SEMANTIC_GENERALIZATION =
  "cme-semantic-generalization";

export function isCmeSemanticGeneralization (
  what: CmeSemanticEntity | undefined | null,
): what is CmeSemanticGeneralization  {
  return what?.type.includes(CME_SEMANTIC_GENERALIZATION) ?? false;
}
