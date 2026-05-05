import { CmeGeneralization } from "../../../dataspecer/cme-model";
import { UI_GENERALIZATION_TYPE, UiEntity, UiGeneralization, UiSemanticModel } from "../model";

export const cmeGeneralizationToCmeGeneralization = (
  model: UiSemanticModel,
  entity: CmeGeneralization,
  parent: UiEntity,
  child: UiEntity,
): UiGeneralization => {
  return {
    type: UI_GENERALIZATION_TYPE,
    model,
    identifier: entity.identifier,
    label: child.label + " -> " + parent.label,
    parent,
    child,
  };
};
