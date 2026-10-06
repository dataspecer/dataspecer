/**
 * Bind all registered providers and make them accessible via React context.
 *
 * A {@link CmeBridge} is the single subscriber to the Dataspecer store. It
 * pushes every {@link EntitiesChangeEvent} into all registered providers,
 * collects the resulting {@link CmeProviderEvent}s and fans them out to two
 * kinds of consumer:
 * - {@link CmeListener}s collected from {@link cmeListenersRegistry} at
 *   construction time, which therefore see every event from the start;
 * - React components that subscribe later through {@link useCmeProviders} /
 *   {@link useGuarderCmeProviders}.
 *
 * A React component can mount after the bridge has already processed events.
 * To bring it up to date the bridge caches the most recent event of each
 * `type` and replays that cache to every new subscriber. Only coalesced state
 * events (`*StateEvent`, which carry the full current state) can be replayed
 * this way; a pure delta event (`*ChangeEvent`) must not be relied on alone by
 * a late-mounting consumer.
 */
import React, { useContext, useEffect, useMemo } from "react";
import {
  CmeDataspecerPackageApi,
  EntitiesChangeEvent,
} from "../../infrastructure/dataspecer";
import { Logger } from "../../infrastructure/logger";
import { CmeListener, CmeProvider, CmeProviderEvent } from "./cme-provider";
import { cmeListenersRegistry, cmeProvidersRegistry } from "./cme-provider-registry";
import { SubscriptionManager } from "../../shared/subscription-manager";

/**
 * Provide access to registered providers.
 */
interface CmeProvidersContextValue {

  subscribe(subscriber: (value: CmeProviderEvent) => void): () => void;

}

const CmeProvidersContext =
  React.createContext<CmeProvidersContextValue | null>(null);

export function WithCmeProviders(props: {
  dataspecer: CmeDataspecerPackageApi,
  logger: Logger,
  children: React.ReactNode,
}) {
  // Collect registered items.
  const logger = props.logger;
  const cmeBridge = useMemo(() => new CmeBridge(logger), [logger]);

  // Register for changes and pass it to all subscribers.
  const dataspecer = props.dataspecer;
  useEffect(() => {
    return dataspecer.subscribe((event) => {
      cmeBridge.onEntitiesDidChange(event);
    });
  }, [dataspecer, cmeBridge]);

  return React.createElement(CmeProvidersContext.Provider, {
    value: cmeBridge,
    children: props.children,
  });
}

class CmeBridge implements CmeListener {

  private readonly providers: CmeProvider[];

  private readonly listeners: CmeListener[];

  private readonly subscribers = new SubscriptionManager<CmeProviderEvent>();

  /**
   * Most recent event per {@link CmeProviderEvent.type}, replayed to every
   * subscriber that registers after the bridge has started processing events.
   */
  private readonly lastEventByType = new Map<string, CmeProviderEvent>();

  constructor(logger: Logger) {
    this.providers = cmeProvidersRegistry.list()
      .map(item => item.createCmeProvider({ logger }));
    this.listeners = cmeListenersRegistry.list()
      .map(item => item.listCmeListener())
      .flat();
    // Subscribe to all providers.
    this.onProviderEvent = this.onProviderEvent.bind(this);
    this.providers.forEach(provider => provider.subscribe(this.onProviderEvent));
  }

  onEntitiesDidChange(event: EntitiesChangeEvent): void {
    this.providers.forEach(provider => provider.onEntitiesDidChange(event));
  }

  onProviderEvent(event: CmeProviderEvent): void {
    this.lastEventByType.set(event.type, event);
    // Pass event to registry listeners and to React subscribers.
    this.listeners.forEach(listener => listener.onProviderEvent(event));
    this.subscribers.notifyAll(event);
  }

  subscribe(subscriber: (value: CmeProviderEvent) => void): () => void {
    // Replay the latest event of each type so a listener that mounts after
    // initialization is brought up to date.
    for (const event of this.lastEventByType.values()) {
      subscriber(event);
    }
    return this.subscribers.subscribe(subscriber);
  }

}

/**
 * Register a listener for all {@link CmeProviderEvent}s.
 * The listener is replayed the latest event of each type on registration.
 */
export function useCmeProviders(
  listener: (value: CmeProviderEvent) => void,
) {
  const provider = useContext(CmeProvidersContext);
  useEffect(() => {
    if (provider === null) {
      return;
    }
    return provider.subscribe(listener);
  }, [listener, provider]);
}

/**
 * Register a listener for {@link CmeProviderEvent}s matching the given guard.
 * The listener is replayed the latest event of each type on registration.
 */
export function useGuarderCmeProviders<EventType extends CmeProviderEvent>(
  guard: (value: CmeProviderEvent) => value is EventType,
  listener: (value: EventType) => void,
) {
  const provider = useContext(CmeProvidersContext);
  useEffect(() => {
    if (provider === null) {
      return;
    }
    return provider.subscribe(event => {
      if (guard(event)) {
        listener(event);
      }
    });
  }, [guard, listener, provider]);
}
