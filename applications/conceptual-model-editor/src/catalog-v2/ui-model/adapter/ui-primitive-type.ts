import { CmePrimitiveType } from "@/dataspecer/cme-model";
import { UI_PRIMITIVE_TYPE_TYPE, UiPrimitiveType, UiSemanticModel } from "../model";
import { SelectLabel } from "./adapter-context";

export const cmePrimitiveTypeToUiPrimitiveType = (
  context: {
    selectLabel: SelectLabel,
  },
  model: UiSemanticModel,
  entity: CmePrimitiveType,
): UiPrimitiveType => {
  return {
    type: UI_PRIMITIVE_TYPE_TYPE,
    model,
    identifier: entity.identifier,
    // For primitive types we use identifier as the IRI.
    iri: entity.iri ?? entity.identifier,
    label: context.selectLabel(entity.name, entity.iri, entity.identifier),
  };
};
