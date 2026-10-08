import { HexColor } from "@dataspecer/visual-model";

import { VisualColorDialogState } from "./visual-color-dialog-state";

export interface VisualColorDialogController {

  /**
   * Set custom color, use null to use the model color.
   */
  setVisualColor: (value: HexColor | null) => void;

}

export function createVisualColorDialogController<
  StateType extends VisualColorDialogState,
>(
  changeState: (next: StateType | ((prevState: StateType) => StateType)) => void,
): VisualColorDialogController {

  const setVisualColor = (value: HexColor | null) => changeState(state => ({
    ...state,
    visualColor: value,
  }));

  return {
    setVisualColor,
  };
}
