import { WritableVisualModel, isWritableVisualModel } from "@dataspecer/visual-model";
import { UseDiagramType } from "../diagram/diagram-hook";
import { createLogger } from "../application";

const LOG = createLogger(import.meta.url);

/**
 * Saves the current viewport position to the visual model's VisualView entity.
 * This allows the position to be restored when the model is loaded again.
 * 
 * @param visualModel - The writable visual model to save the viewport position to
 * @param diagram - The diagram to get the current viewport position from
 */
export function saveViewportPositionAction(
  visualModel: WritableVisualModel | null,
  diagram: UseDiagramType | null
): void {
  if (visualModel === null || !isWritableVisualModel(visualModel)) {
    LOG.warn("Cannot save viewport position: visual model is not writable", { visualModel });
    return;
  }

  if (diagram === null || !diagram.areActionsReady) {
    LOG.warn("Cannot save viewport position: diagram is not ready", { diagram });
    return;
  }

  try {
    const viewport = diagram.actions().getViewport();
    LOG.trace("Saving viewport position", { viewport });

    // Save the current viewport position to the visual view
    visualModel.setView({
      initialPositions: {
        x: viewport.position.x,
        y: viewport.position.y,
      },
    });

    LOG.trace("Viewport position saved successfully", {
      x: viewport.position.x,
      y: viewport.position.y,
    });
  } catch (error) {
    LOG.error("Failed to save viewport position", { error });
  }
}
