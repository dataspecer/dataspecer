import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCmeSemanticModelState } from "../cme-semantic-model";
import { useCmeProfileModelState } from "../cme-profile-model";

import {
  CmeAggregateModelState,
  createCmeAggregateModelState,
  createEmptyCmeAggregateModelState,
} from "./cme-aggregate-model-state";
import {
  CmeAggregateModelApi,
  createCmeAggregateModelApi,
} from "./cme-aggregate-model-api";

type CmeAggregateModelStateContext = CmeAggregateModelState;

const CmeAggregateModelStateContextReact =
  React.createContext<CmeAggregateModelStateContext>(null as any);

type CmeAggregateModelApiContext = CmeAggregateModelApi;

const CmeAggregateModelApiContextReact =
  React.createContext<CmeAggregateModelApiContext>(null as any);

export const useCmeAggregateModelState = (): CmeAggregateModelState => {
  return useContext(CmeAggregateModelStateContextReact);
}

export const useCmeAggregateModelApi = (): CmeAggregateModelApi => {
  return useContext(CmeAggregateModelApiContextReact);
}

export function CmeAggregateModelContextProvider(
  props: {
    children: React.ReactNode,
  },
) {
  const semantic = useCmeSemanticModelState();
  const profile = useCmeProfileModelState();
  // We use reference to keep the latest
  const stateReference = useRef(createEmptyCmeAggregateModelState());
  const [state, setState] = useState<CmeAggregateModelStateContext>(
    createEmptyCmeAggregateModelState());

  /**
   * This is simple implementation, we can optimize it to get better
   * performance should that be necessary.
   */
  useEffect(() => {
    const next = createCmeAggregateModelState(semantic, profile);
    setState(next);
    stateReference.current = next;
  }, [semantic, profile, stateReference, setState]);

  const api = useMemo(() => createCmeAggregateModelApi(stateReference),
    [stateReference]);

  return (
    <CmeAggregateModelApiContextReact.Provider value={api}>
      <CmeAggregateModelStateContextReact.Provider value={state}>
        {props.children}
      </CmeAggregateModelStateContextReact.Provider>
    </CmeAggregateModelApiContextReact.Provider>
  )
}
