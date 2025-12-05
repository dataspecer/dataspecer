import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

import { VisualModel } from "@dataspecer/visual-model";
import { SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";

import { UiModelApi } from "./ui-model-api";
import { UiModelState } from "./ui-model-state";
import { UiEntity } from "./model";

interface UiModelContextType {

  api: UiModelApi;

  state: UiModelState;

}

//

type UiEntityChange = { previous: UiEntity | null, next: UiEntity | null };

export interface UiModeObserver {

  uiEntitiesDidChange(entities: UiEntityChange[]): void;

}

//

const UiModelContext = React.createContext<UiModelContextType>({} as any);

export function WithUiModel(props: {
  aggregatorView: SemanticModelAggregatorView,
  visualModel: VisualModel | null,
  children: React.ReactNode
}) {
  const { visualModel, aggregatorView } = props;

  const observers = useRef<UiModeObserver[]>([]);
  const [state, setState] = useState({} as any);

  const api = useMemo((): UiModelApi => {
    return {

    } as any;
  }, [observers]);

  // Register for changes in the
  useEffect(() => {

  }, [aggregatorView, observers]);

  useEffect(() => {

  }, [visualModel, observers]);

  // Memoize context value.
  const context = useMemo(() => ({ api, state }), [api, state]);

  return (
    <UiModelContext value={context}>
      {props.children}
    </UiModelContext>
  )
}

export function useUiModelApi(): UiModelApi {
  const context = useContext(UiModelContext);
  return context.api;
}

export function useUiModelState(): UiModelState {
  const context = useContext(UiModelContext);
  return context.state;
}

