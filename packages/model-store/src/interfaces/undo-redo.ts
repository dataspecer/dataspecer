import type { ChangeEvent, ObservableModelStore } from "./observable.ts";

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
}

export interface UndoRedoModelStore<ChangeEventType extends UndoRedoChangeEvent = UndoRedoChangeEvent> extends ObservableModelStore<ChangeEventType> {
  getUndoRedoState(): UndoRedoState;
  undo(): void;
  redo(): void;
}

export interface UndoRedoChangeEvent extends ChangeEvent {
  undoRedo?: UndoRedoState;
}