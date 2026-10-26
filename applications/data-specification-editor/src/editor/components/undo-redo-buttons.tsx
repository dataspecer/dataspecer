import type { UndoRedoModelStore } from "@dataspecer/model-store";
import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import { Button, Tooltip } from "@mui/material";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUndoRedoState } from "../hooks/use-undo-redo-state";

/**
 * Returns true if the keyboard event originates from an editable element (text
 * input, textarea, contenteditable, ...), in which case the browser's native
 * undo/redo should be left alone instead of being hijacked by the model store.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * Undo/redo buttons for the editor's app bar, bound to the data specification's
 * model store. Reflects the model store's undo/redo state reactively and also
 * registers the Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) keyboard shortcuts.
 */
export const UndoRedoButtons: React.FC<{ modelStore: UndoRedoModelStore | null | undefined }> = ({ modelStore }) => {
  const { t } = useTranslation("ui");
  const { canUndo, canRedo } = useUndoRedoState(modelStore);

  useEffect(() => {
    if (!modelStore) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        modelStore.undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        modelStore.redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modelStore]);

  return (
    <div style={{ display: "flex", gap: "1em" }}>
      <Tooltip title={"(Ctrl+Z)"}>
        <span>
          <Button startIcon={<UndoIcon />} color="inherit" disabled={!canUndo} onClick={() => modelStore?.undo()}>
            {t("undo")}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={"(Ctrl+Y)"}>
        <span>
          <Button startIcon={<RedoIcon />} color="inherit" disabled={!canRedo} onClick={() => modelStore?.redo()}>
            {t("redo")}
          </Button>
        </span>
      </Tooltip>
    </div>
  );
};
