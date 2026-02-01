import React, {useCallback, useEffect, useState} from "react";

/**
 * This hook calls save method when user requests it if the first argument is
 * true, indicating that there are unsaved changes.
 *
 * Also, the information about unsaved changes is propagated to the parent
 * through {@link useSaveHandlerProvider}
 */
export function useSaveHandler(hasUnsavedChanges: boolean, save: () => unknown | Promise<unknown>) {
    const dialogSaveStatusContext = React.useContext(SaveHandlerContext);
    const saveChanges = useCallback(() => dialogSaveStatusContext.triggerSaveListeners(), [dialogSaveStatusContext]);
    const saveWrapper = useCallback(() => {
        if (hasUnsavedChanges) {
            return save();
        }
    }, [hasUnsavedChanges, save]);

    useEffect(() => {
        if (hasUnsavedChanges) {
            dialogSaveStatusContext.incrementUnsavedChanges();
            return () => dialogSaveStatusContext.decrementUnsavedChanges();
        }
    }, [hasUnsavedChanges, dialogSaveStatusContext]);

    useEffect(() => {
        dialogSaveStatusContext.addSaveListener(saveWrapper);
        return () => dialogSaveStatusContext.removeSaveListener(saveWrapper);
    }, [saveWrapper, dialogSaveStatusContext]);

    return {
        saveChanges
    }
}

export const SaveHandlerContext = React.createContext<SaveHandler>(null as unknown as SaveHandler);

/**
 * Creates new context for child components to use {@link useSaveHandler} to
 * save changes and propagate whether changes are unsaved.
 */
export function useSaveHandlerProvider() {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [dialogSaveStatusContext] = useState(new SaveHandler(setHasUnsavedChanges));
    const saveChanges = useCallback(() => dialogSaveStatusContext.triggerSaveListeners(), [dialogSaveStatusContext]);

    return {
        hasUnsavedChanges,
        saveChanges,
        saveHandler: dialogSaveStatusContext,
    };
}

export class SaveHandler {
    private readonly listeners: Set<() => unknown | Promise<unknown>> = new Set();
    private unsavedChangesCounter: number = 0;
    private readonly onUnsavedChangesChanged: (unsaved: boolean) => void;

    constructor(onUnsavedChangesChanged: (unsaved: boolean) => void) {
        this.onUnsavedChangesChanged = onUnsavedChangesChanged;
    }

    addSaveListener(listener: () => unknown | Promise<unknown>) {
        this.listeners.add(listener);
    }

    removeSaveListener(listener: () => unknown | Promise<unknown>) {
        this.listeners.delete(listener);
    }

    incrementUnsavedChanges() {
        this.unsavedChangesCounter++;
        if (this.unsavedChangesCounter === 1) {
            this.onUnsavedChangesChanged(true);
        }
    }

    decrementUnsavedChanges() {
        this.unsavedChangesCounter--;
        if (this.unsavedChangesCounter === 0) {
            this.onUnsavedChangesChanged(false);
        }
    }

    async triggerSaveListeners() {
        for (const listener of [...this.listeners]) {
            await listener(); // Non promises are handled correctly
        }
    }
}
