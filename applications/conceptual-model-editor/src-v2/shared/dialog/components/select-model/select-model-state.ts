import { ModelIdentifier } from "@dataspecer/core/model";
import { HexColor } from "@dataspecer/visual-model";

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

