import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";

export interface CmeGeneralizationAggregate extends CmeEntityAggregate {

  type: typeof CME_GENERALIZATION_AGGREGATE;

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

  /**
   * Semantic or profiled models with definition of this entity.
   */
  models: ModelDsIdentifier[];

}

const CME_GENERALIZATION_AGGREGATE =
  "cme-generalization-aggregate";

export function isCmeGeneralization (
  what: CmeEntityAggregate | undefined | null,
): what is CmeGeneralizationAggregate  {
  return what?.type === CME_GENERALIZATION_AGGREGATE;
}
