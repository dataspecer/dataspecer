import { UiEntity } from "./ui-entity";

export const UI_PRIMITIVE_TYPE_TYPE = "ui-primitive-type";

export interface UiPrimitiveType extends UiEntity {

  type: typeof UI_PRIMITIVE_TYPE_TYPE;

  iri: string;

}

export function isUiDatatype(
  entity: UiEntity | null,
): entity is UiPrimitiveType {
  return entity?.type === UI_PRIMITIVE_TYPE_TYPE;
}
