import React, { useContext, useMemo, useState } from "react";
import {
  ApplicationState, createApplicationState, SelectedEntity,
} from "./application-state";
import { SelectionApi } from "./application-selection-api";

export function useApplicationState(): {
  state: ApplicationState,
  selectionApi: SelectionApi,
} {
  return useContext(ApplicationContext);
}

export function WithApplicationState(props: { children: React.ReactNode }) {

  const [state, setState] = useState(createApplicationState());

  const selectionApi = useMemo((): SelectionApi => {
    return {
      toggle(model, entity) {
        setState(previous => {
          const index = previous.selection.findIndex(item =>
            item.model === model && item.entity === entity);
          if (index === -1) {
            // Item not in selection, it is now the selection.
            return {
              ...previous,
              selection: [{ model, entity }],
            };
          } else {
            // User clicked on the active item.
            if (previous.selection.length === 1) {
              // It is the only item, we cancel the selection.
              return {
                ...previous,
                selection: [],
              };
            } else {
              // There are more selected we keep only this one.
              return {
                ...previous,
                selection: [{ model, entity }],
              };
            }
          }
        });
      },
      toggleWithShift(model, entity) {
        setState(previous => {
          const index = previous.selection.findIndex(item =>
            item.model === model && item.entity === entity);
          if (index === -1) {
            // Item not in selection, we need to add it.
            return {
              ...previous,
              selection: [...previous.selection, { model, entity }],
            };
          } else {
            return {
              ...previous,
              selection: [
                ...previous.selection.slice(0, index),
                ...previous.selection.slice(index + 1),
              ]
            };
          }
        });
      },
      set(items: SelectedEntity[]) {
        setState(previous => ({ ...previous, selection: items }));
      },
    };
  }, [setState]);

  const context: ApplicationStateContextType = useMemo(() => ({
    state, selectionApi,
  }), [state, selectionApi]);

  return React.createElement(ApplicationContext.Provider, {
    value: context,
    children: props.children,
  });
}

const ApplicationContext =
  React.createContext<ApplicationStateContextType>(null as any);

interface ApplicationStateContextType {

  state: ApplicationState;

  selectionApi: SelectionApi;

}
