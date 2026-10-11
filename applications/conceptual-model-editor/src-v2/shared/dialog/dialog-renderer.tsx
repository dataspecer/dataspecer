import React, { useContext, useEffect, useRef } from "react";

import { DialogApiContext, DialogRendererContext } from "./dialog-context";
import { type DialogRendererContextType } from "./dialog-service";

import { t } from "@src/application/";

import "./dialog-renderer.css";

/**
 * This component is responsible for rendering dialogs on screen.
 */
export function DialogRenderer() {
  const api = useContext(DialogApiContext);
  const state = useContext(DialogRendererContext);
  const reference = useRef(null as unknown as HTMLDialogElement);

  if (api === null || state === null) {
    return null;
  }

  return <Dialog reference={reference} context={state} />;
}

function Dialog({ reference, context }: {
  reference: React.MutableRefObject<HTMLDialogElement>,
  context: DialogRendererContextType<any>,
}) {

  useEffect(() => {
    // We need to call this when dialog is open for the first time.
    reference.current?.showModal();
  }, [reference]);

  const defaultClassNames = "m-auto base-dialog z-50 flex flex-col " +
    "min-h-[400px] max-h-[85vh] w-[95%] max-w-2xl rounded-xl border border-border bg-background p-6 " +
    "text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-xs";

  const Component = context.component;
  return (
    <dialog
      ref={reference}
      className={context.dialogClassNames === undefined ? defaultClassNames : context.dialogClassNames}
      onCancel={context.close}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h1 className="text-base font-semibold tracking-tight text-foreground">{t(context.label)}</h1>
      </div>
      <div className="py-4 flex-1 overflow-y-auto">
        <Component state={context.state} changeState={context.changeState} close={context.close} />
      </div>
      <div className="mt-auto flex flex-row items-center justify-end gap-2 pt-3 border-t border-border">
        <button
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onClick={context.close}
        >
          {t(context.closeLabel)}
        </button>
        {context.confirmLabel === null ? null :
          <button
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            onClick={context.confirm}
            disabled={!context.canConfirm}
          >
            {t(context.confirmLabel)}
          </button>
        }
      </div>
    </dialog>
  );
}
