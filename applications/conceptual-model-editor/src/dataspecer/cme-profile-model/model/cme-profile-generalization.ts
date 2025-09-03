import { EntityDsIdentifier } from "../../entity-model";
import { CmeProfileEntity } from "./cme-profile-entity";

export interface CmeProfileGeneralization extends CmeProfileEntity {

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

export const CME_PROFILE_GENERALIZATION =
  "cme-Profile-generalization";

export function isCmeProfileGeneralization (
  what: CmeProfileEntity | undefined | null,
): what is CmeProfileGeneralization  {
  return what?.type.includes(CME_PROFILE_GENERALIZATION) ?? false;
}
