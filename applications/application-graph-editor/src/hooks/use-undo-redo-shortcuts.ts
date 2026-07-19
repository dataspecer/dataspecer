import { useEffect } from "react";
import { useEditorStore } from "../store.ts";

/** Binds Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z to redo on the graph. */
export function useUndoRedoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      // text inputs keep their native undo
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      const temporal = useEditorStore.temporal.getState();
      if (event.shiftKey) {
        temporal.redo();
      } else {
        temporal.undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
