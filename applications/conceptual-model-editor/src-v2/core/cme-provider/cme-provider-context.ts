/**
 * Bind all registered providers and make them accessible via React context.
 */
import React, { useContext, useEffect, useMemo } from "react";
import {
  CmeDataspecerPackageApi,
  EntitiesChangeEvent,
} from "../../infrastructure/dataspecer";
import { Logger } from "../../infrastructure/logger";
import { CmeProvider, CmeProviderEvent } from "./cme-provider";
import { cmeProvidersRegistry } from "./cme-provider-registry";
import { SubscriptionManager } from "../../shared/subscription-manager";

const CmeProvidersContext =
  React.createContext<CmeProvidersContextType>(null as any);

/**
 * Provide access to registered providers.
 */
interface CmeProvidersContextType {

  subscribe(subscriber: (value: CmeProviderEvent) => void): () => void;

}

export function WithCmeProviders(props: {
  dataspecer: CmeDataspecerPackageApi,
  logger: Logger,
  children: React.ReactNode,
}) {
  // Create providers from registered contribution.
  const logger = props.logger;
  const cmeProviders = useMemo(() => new CmeProviders(logger), [logger]);

  // Register for changes and pass it to all subscribers.
  const dataspecer = props.dataspecer;
  useEffect(() => {
    return dataspecer.subscribe((event) => {
      cmeProviders.onEntitiesDidChange(event);
    });
  }, [dataspecer, cmeProviders]);

  return React.createElement(CmeProvidersContext.Provider, {
    value: cmeProviders,
    children: props.children
  });
}

class CmeProviders {

  private readonly logger: Logger;

  private readonly providers: CmeProvider[];

  private readonly subscribers = new SubscriptionManager<CmeProviderEvent>();

  constructor(logger: Logger) {
    this.logger = logger;
    this.providers = cmeProvidersRegistry.list()
      .map(item => item.create({ logger }));
    // Register for events.
    this.notify = this.notify.bind(this);
    this.providers.forEach(provider => provider.subscribe(this.notify));
  }

  onEntitiesDidChange(event: EntitiesChangeEvent): void {
    this.providers.forEach(provider => provider.onEntitiesDidChange(event));
  }

  notify(event: CmeProviderEvent) {
    this.subscribers.notifyAll(event);
  }

  subscribe(subscriber: (value: CmeProviderEvent) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}

/**
 * Register listener for {@link CmePackage} state.
 */
export function useCmeProviders(
  listener: (value: CmeProviderEvent) => void,
) {
  const provider = useContext(CmeProvidersContext);
  // Register a new listeners pass only when the event is of desired type.
  useEffect(() => provider.subscribe(event => {
    listener(event);
  }), [listener, provider]);
}

/**
 * Register listener for {@link CmePackage} state.
 * Pass only events that match given guard.
 */
export function useGuarderCmeProviders<EventType extends CmeProviderEvent>(
  guard: (value: CmeProviderEvent) => value is EventType,
  listener: (value: EventType) => void,
) {
  const provider = useContext(CmeProvidersContext);
  // Register a new listeners pass only when the event is of desired type.
  useEffect(() => provider.subscribe(event => {
    if (guard(event)) {
      listener(event);
    }
  }), [guard, listener, provider]);
}
