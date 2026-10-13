import { VisualModel } from "@dataspecer/visual-model";

import { createLogger } from "../../application";
import { ClassesContext } from "../../context/classes-context";
import {
  createCmeOperationExecutor,
  SetVisualEntityColorOperation,
} from "../../operation";
import {
  selectColorableVisualEntities,
  VisualColorDialogState,
} from "../../dialog/visual-color/visual-color-dialog-state";

const LOG = createLogger(import.meta.url);

/**
 * Apply custom color from a dialog to all visual entities representing
 * given entity in the visual model.
 * Does nothing when the color has not changed.
 *
 * This is sort of a temporary function to set colors for all instances
 * of given entity. This may be removed once we add support for per-instance
 * visual dialogs and support for per-class visual information to visual model.
 */
export function applyVisualColorFromDialog(
  classes: ClassesContext,
  visualModel: VisualModel | null,
  represented: string,
  initialState: VisualColorDialogState,
  state: VisualColorDialogState,
): void {
  if (visualModel === null || !state.visualColorAvailable
    || initialState.visualColor === state.visualColor) {
    return;
  }
  const visualEntities = selectColorableVisualEntities(visualModel, represented)
    .map(item => item.id);
  const executor = createCmeOperationExecutor(
    classes.semanticModelsList, classes.visualModelsList);
  executor.execute<SetVisualEntityColorOperation>({
    type: "set-visual-entity-color-operation",
    visualModel: visualModel.getId(),
    visualEntities,
    color: state.visualColor,
  }).catch(error => LOG.error("Can not set visual entity color.", error));
}
