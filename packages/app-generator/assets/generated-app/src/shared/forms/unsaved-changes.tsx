import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, type Blocker, type BlockerFunction } from 'react-router-dom';

import { ConfirmDialog } from '../components/confirm-dialog.tsx';

export interface UnsavedChanges {
  /** Marks the form as changed. */
  markDirty: () => void;
  /** Allows navigation after save or cancel without showing a warning. */
  markSaved: () => void;
  blocker: Blocker;
}

/** Warns before closing or navigating away from a changed form. */
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

  // changing panes only changes the query, it does not leave the form
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
