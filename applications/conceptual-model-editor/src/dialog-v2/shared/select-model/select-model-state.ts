import { ModelIdentifier } from "@dataspecer/entity-model";
import { HexColor } from "@dataspecer/visual-model";
import { AdapterContext } from "../adapter-context";

export interface SelectModelState {

  /**
   * Selected model or null when no value is selected.
   */
  value: SelectModelItem | null;

  /**
   * Available models for selection.
   */
  items: SelectModelItem[];

}

export interface SelectModelItem {

  identifier: ModelIdentifier;

  displayLabel: string;

  displayColor: HexColor;

}

export function createSelectModel(
  { tracker }: AdapterContext,
  value: ModelIdentifier | null,
): SelectModelState {
  const items: SelectModelItem[] = [...tracker.semanticModels.values()
    .filter(model => !model.isReadOnly)
    .map(model => ({
      identifier: model.model,
      displayLabel: model.label[""],
      displayColor: "#00ddff",
    } satisfies SelectModelItem))];

  return {
    items,
    value: value === null ? null : (
      items.find(item => item.identifier === value) ?? null
    ),
  }
}
