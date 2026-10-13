import { useMemo } from "react";

import { type DialogProps } from "../dialog-api";
import { GeneralizationDialogState } from "./edit-generalization-dialog-state";
import {
  createVisualColorDialogController,
  type VisualColorDialogController,
} from "../visual-color/visual-color-dialog-controller";

export type GeneralizationDialogController = VisualColorDialogController;

export function useGeneralizationDialogController(
  { changeState }: DialogProps<GeneralizationDialogState>,
): GeneralizationDialogController {
  return useMemo(() => {
    return {
      ...createVisualColorDialogController(changeState),
    };
  }, [changeState]);
}
