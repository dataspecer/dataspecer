import type { UndoRedoModelStore, UndoRedoState } from "@dataspecer/model-store";
import { useEffect, useState } from "react";

const NO_UNDO_REDO_STATE: UndoRedoState = { canUndo: false, canRedo: false };

/**
 * Reactively tracks the undo/redo state of the given model store, so that
 * components such as undo/redo buttons can re-render when it changes.
 */
export function useUndoRedoState(store: UndoRedoModelStore | null | undefined): UndoRedoState {
  const [state, setState] = useState<UndoRedoState>(() => store?.getUndoRedoState() ?? NO_UNDO_REDO_STATE);

  useEffect(() => {
    if (!store) {
      setState(NO_UNDO_REDO_STATE);
      return;
    }
    setState(store.getUndoRedoState());
    return store.subscribeToUndoRedoState(setState);
  }, [store]);

  return state;
}
