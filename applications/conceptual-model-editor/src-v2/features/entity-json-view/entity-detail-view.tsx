import { useSyncExternalStore } from "react";
import { EntityIdentifier } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";

import { SubscriptionManager } from "../../shared/subscription-manager";
import { EntityDetailContribution } from "../../core/entity-view";
import {
  CME_ENTITY_DATA_STATE_TYPE, CmeEntityDataStateEvent, isCmeEntityDataStateEvent,
} from "./cme-entity-data-provider";

/**
 * Catch-all fallback detail view rendering the raw entity JSON.
 * Register this after any feature-specific {@link EntityDetailContribution}s
 * so those are preferred over this fallback.
 *
 * State lives in the contribution itself, fed via {@link onProviderEvent},
 * which is wired to receive every event from app start regardless of
 * whether {@link detailComponent} is currently mounted. This avoids missing
 * the one-time initial entity snapshot, which would happen if the rendered
 * component subscribed to provider events on its own.
 */
export function createJsonEntityDetailContribution(): EntityDetailContribution {
  let state: CmeEntityDataStateEvent = createEmptyState();
  const subscribers = new SubscriptionManager<void>();

  const subscribe = (onChange: () => void) => subscribers.subscribe(onChange);
  const getSnapshot = () => state;

  return {
    id: "cme-json-entity-detail-view",
    onProviderEvent: (event) => {
      if (isCmeEntityDataStateEvent(event)) {
        state = event;
        subscribers.notifyAll(undefined);
      }
    },
    canRenderDetail: () => true,
    detailComponent: (props) => (
      <JsonEntityDetailView
        entity={props.entity}
        model={props.model}
        subscribe={subscribe}
        getSnapshot={getSnapshot}
      />
    ),
  };
}

function JsonEntityDetailView(props: {
  entity: EntityIdentifier,
  model: ModelIdentifier,
  subscribe: (onChange: () => void) => () => void,
  getSnapshot: () => CmeEntityDataStateEvent,
}) {
  const state = useSyncExternalStore(props.subscribe, props.getSnapshot);

  const entity = state.entities[props.model]?.[props.entity] ?? null;
  const aggregate = state.aggregates[props.model]?.[props.entity] ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-3 py-2 text-[11.5px] text-zinc-500">
        {props.model} : {props.entity}
      </div>
      <div className="flex-1 overflow-auto p-3">
        {entity === null && aggregate === null ? (
          <div className="text-[12.5px] text-zinc-600">No data available.</div>
        ) : (
          <>
            {entity !== null && (
              <JsonSection label="Entity" value={entity} />
            )}
            {aggregate !== null && (
              <JsonSection label="Aggregated" value={aggregate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function JsonSection(props: { label: string, value: unknown }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {props.label}
      </div>
      <pre className="whitespace-pre-wrap break-all text-[12px] text-zinc-300">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}

function createEmptyState(): CmeEntityDataStateEvent {
  return { type: CME_ENTITY_DATA_STATE_TYPE, entities: {}, aggregates: {} };
}
