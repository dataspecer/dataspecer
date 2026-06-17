import type { TransactionResult, WritableModelStore } from "./writable.ts";

/**
 * @todo list of operations that can be undone and redone for better UX.
 */
export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Model that supports undo and redo operations. The undo/redo operations have same return semantics as the transaction from {@link WritableModelStore}
 */
export interface UndoRedoModelStore {
  getUndoRedoState(): UndoRedoState;
  subscribeToUndoRedoState(listener: (state: UndoRedoState) => void): () => void;
  undo(): TransactionResult;
  redo(): TransactionResult;
}
