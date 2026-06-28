import { UiEntity } from "./ui-entity";

export const UI_CLASS_TYPE = "ui-class-type";

export interface UiClass extends UiEntity {

  type: typeof UI_CLASS_TYPE;

  iri: string;

  description: string;

}

export function isUiClass(entity: UiEntity | null): entity is UiClass {
  return entity?.type === UI_CLASS_TYPE;
}
