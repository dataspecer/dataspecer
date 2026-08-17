import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, type Blocker, type BlockerFunction } from 'react-router-dom';

import { ConfirmDialog } from '../components/confirm-dialog.tsx';

export interface UnsavedChanges {
  /** Called when the user edits the form. */
  markDirty: () => void;
  /** Called before leaving on purpose, so the redirect after a save is not questioned. */
  markSaved: () => void;
  blocker: Blocker;
}

/**
 * Guards a form against losing edits, both when the tab closes and when the application navigates
 * away.
 */
export function useUnsavedChanges(): UnsavedChanges {
  const dirty = useRef(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Moving between the panes of one form only changes the query, and is not leaving the form.
  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        dirty.current && currentLocation.pathname !== nextLocation.pathname,
      []
    )
  );

  const markDirty = useCallback(() => {
    dirty.current = true;
  }, []);
  const markSaved = useCallback(() => {
    dirty.current = false;
  }, []);

  return { markDirty, markSaved, blocker };
}

export function UnsavedChangesDialog(props: { blocker: Blocker }) {
  const { blocker } = props;
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Leave this page?"
      message="Your changes have not been saved and will be lost."
      confirmLabel="Discard changes"
      cancelLabel="Stay"
      destructive
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}
