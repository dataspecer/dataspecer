import { useMemo } from "react";

import { type DialogProps } from "../dialog-api";
import { configuration } from "../../application";
import { type ClassDialogState } from "./edit-class-dialog-state";
import {
  type BaseEntityDialogController,
  createBaseEntityDialogController,
} from "../base-entity/base-entity-dialog-controller";
import {
  createVisualColorDialogController,
  type VisualColorDialogController,
} from "../visual-color/visual-color-dialog-controller";

export type ClassDialogController =
  BaseEntityDialogController & VisualColorDialogController;

export function useClassDialogController(
  { changeState }: DialogProps<ClassDialogState>,
): ClassDialogController {
  return useMemo(() => {
    return {
      ...createBaseEntityDialogController(
        changeState, configuration().classNameToIri),
      ...createVisualColorDialogController(changeState),
    };
  }, [changeState]);
}
