import { useEffect } from 'react';
import { useEditorStore } from '@/store.ts';

/** Warns before the tab closes when the current screen has work that would be lost. */
export function useBeforeUnload(shouldWarn: () => boolean): void {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldWarn()) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [shouldWarn]);
}

function editorHasUnsavedWork(): boolean {
  const { jsonDraft, saveState } = useEditorStore.getState();
  const editedDraft = jsonDraft !== null && jsonDraft.text !== jsonDraft.base;
  const brokenSave = saveState === 'invalid' || saveState === 'error';
  return editedDraft || brokenSave;
}

/**
 * Warns before the tab closes while there is work that would be erased: unsaved JSON draft or graph changes autosave
 * cannot persist (invalid syntax or a failing backend).
 */
export function useUnloadWarning(): void {
  useBeforeUnload(editorHasUnsavedWork);
}
