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

  /**
   * Undoes the last transaction. If there is no transaction to undo, returns null.
   */
  undo(): TransactionResult | null;

  /**
   * Redoes the last undone transaction. If there is no transaction to redo, returns null.
   */
  redo(): TransactionResult | null;
}
