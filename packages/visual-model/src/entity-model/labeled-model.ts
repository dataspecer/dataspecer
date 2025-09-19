import { TypedObject, isTypedObject } from "./typed-object.ts";

export type LanguageString = { [language: string]: string };

/**
 * Adds human readable label to a model.
 */
export interface LabeledModel extends TypedObject {

  /**
   * @returns Get human readable label.
   */
  getLabel(): LanguageString | null;

  /**
   * @param label Human readable label for the model.
   */
  setLabel(label: LanguageString | null): void;

}

export const LabeledModelType = "labeled-model";

export function isLabeledModel(what: unknown): what is LabeledModel {
  return isTypedObject(what) && what.getTypes().includes(LabeledModelType);
}
