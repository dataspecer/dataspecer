import React, { useContext, useEffect, useRef } from "react";

import { DialogApiContext, DialogRendererContext } from "./dialog-context";
import { type DialogRendererContextType } from "./dialog-service";

import { t } from "../application/";

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

  const defaultClassNames = "m-auto base-dialog z-30 flex flex-col " +
    "min-h-[70%] w-[97%] p-1 " +
    "md:max-h-[95%] md:w-[70%] md:p-4";

  const Component = context.component;
  return (
    <dialog
      ref={reference}
      className={context.dialogClassNames === undefined ? defaultClassNames : context.dialogClassNames}
      onCancel={context.close}
    >
      <h1 className="text-xl">{t(context.label)}</h1>
      <hr className="my-2" />
      <div>
        { }
        <Component state={context.state} changeState={context.changeState} close={context.close} />
      </div>
      <div className="mt-auto flex flex-row justify-evenly font-semibold">
        {context.confirmLabel === null ? null :
          <button
            className="p-2 text-green-700 hover:shadow"
            onClick={context.confirm}
            disabled={!context.canConfirm}
          >
            {t(context.confirmLabel)}
          </button>
        }
        <button
          className="p-2 text-red-700 hover:shadow"
          onClick={context.close}>
          {t(context.closeLabel)}
        </button>
      </div>
    </dialog>
  );
}
