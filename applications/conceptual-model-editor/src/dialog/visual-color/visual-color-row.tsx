import { t } from "../../application";
import { DialogDetailRow } from "../../components/dialog/dialog-detail-row";
import { SelectColor } from "../components/select-color";
import { VisualColorDialogState } from "./visual-color-dialog-state";
import { VisualColorDialogController } from "./visual-color-dialog-controller";

/**
 * Dialog row to set custom color, renders nothing when the color is not available.
 */
export function VisualColorRow(props: {
  state: VisualColorDialogState,
  controller: VisualColorDialogController,
  /**
   * Shown when there is no custom color.
   */
  modelColor: string,
}) {
  const { state, controller, modelColor } = props;
  if (!state.visualColorAvailable) {
    return null;
  }
  return (
    <DialogDetailRow detailKey={t("dialog.visual-color.label")}>
      <div className="flex gap-2 items-center">
        <SelectColor
          value={state.visualColor ?? modelColor}
          onChange={controller.setVisualColor}
        />
        <button
          type="button"
          className="border border-black px-2 disabled:opacity-50"
          disabled={state.visualColor === null}
          onClick={() => controller.setVisualColor(null)}
        >
          {t("dialog.visual-color.reset")}
        </button>
      </div>
    </DialogDetailRow>
  );
}
