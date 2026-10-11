import React, { createContext, useMemo, useState } from "react";
import {
  type DialogApiContextType,
  type DialogRendererContextType,
  createDialogApiContext,
  createDialogRendererContext,
  createInitialDialogContextStateType,
} from "./dialog-service";

export const DialogApiContext = createContext<DialogApiContextType | null>(null);

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
 * We do not want to place any restriction on the data used by the dialog.
 */
export const DialogRendererContext = createContext<DialogRendererContextType<any> | null>(null);

/**
 * Use this instead of  DialogsContextProvider from ./context/dialogs-context.tsx .
 */
export function DialogContextProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState(createInitialDialogContextStateType());

  const api = useMemo(() => createDialogApiContext(setState), [setState]);

  const renderer = useMemo(() => createDialogRendererContext(state, setState), [state, setState]);

  return (
    <DialogApiContext.Provider value={api}>
      <DialogRendererContext.Provider value={renderer}>
        {props.children}
      </DialogRendererContext.Provider>
    </DialogApiContext.Provider>
  );
}
