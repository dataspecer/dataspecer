import { UiEntity } from "./ui-entity";

export const UI_GENERALIZATION_TYPE = "ui-generalization-type";

export interface UiGeneralization extends UiEntity {

  type: typeof UI_GENERALIZATION_TYPE;

  /**
   * Generalized entity.
   */
  child: UiEntity;

  /**
   * Generalizing entity.
   */
  parent: UiEntity;

}

export function isUiGeneralization(
  entity: UiEntity | null,
): entity is UiGeneralization {
  return entity?.type === UI_GENERALIZATION_TYPE;
}
