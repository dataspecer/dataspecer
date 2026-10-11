import { useMemo } from "react";
import { createStringInputPresenter, StringInputPresenter } from "../../components/string-input";
import { SimpleDialogState } from "./simple-dialog-state";

/**
 * Presenter interface for SimpleDialog combining presenters of its sub-components.
 */
export interface SimpleDialogPresenter {
  name: StringInputPresenter;
  surname: StringInputPresenter;
}

/**
 * Creates presenters for all sub-components used in SimpleDialog.
 * This pattern allows composing arbitrary components from dialog-components.
 */
export function createSimpleDialogPresenter(
  changeState: (next: (state: SimpleDialogState) => SimpleDialogState) => void,): SimpleDialogPresenter 
{
  return {
    name:  createStringInputPresenter((next) => {
              changeState((state) => {
                const currentInput = state?.name ?? { value: (state as any)?.value ?? "" };
                return {
                  ...state,
                  name: next(currentInput),
                };
              });
            }),
    surname:  createStringInputPresenter((next) => {
              changeState((state) => {
                const currentInput = state?.surname ?? { value: (state as any)?.value ?? "" };
                return {
                  ...state,
                  surname: next(currentInput),
                };
              });
            }),
   };
}

/**
 * Hook providing the combined presenter for SimpleDialog.
 */
export function useSimpleDialogPresenter(props: {
  state: SimpleDialogState;
  changeState: (next: SimpleDialogState | ((prevState: SimpleDialogState) => SimpleDialogState)) => void;
}): SimpleDialogPresenter {
  return useMemo(() => {
    const updateFn = (next: (state: SimpleDialogState) => SimpleDialogState) => {
      props.changeState((prevState) => next(prevState));
    };
    return createSimpleDialogPresenter(updateFn);
  }, [props.changeState]);
}


