import { VisualEntity } from "../concepts/visual-entity.ts";

export interface VisualModelSerializationV2 {

  identifier: string;

  version: 2;

  type: "http://dataspecer.com/resources/local/visual-model";

  entities: VisualEntity[];

}

export function isVisualModelSerializationV2(
  what: any,
): what is VisualModelSerializationV2 {
  return what.version === 1
    || what.type === "http://dataspecer.com/resources/local/visual-model";
}
