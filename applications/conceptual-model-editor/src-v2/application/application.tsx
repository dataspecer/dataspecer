import { useMemo } from "react";

import {
  createLabelSelector, LabelSelector, WithLabelSelector,
} from "../infrastructure/i18n";
import {
  CmeConfiguration, createCmeConfiguration
} from "../infrastructure/configuration";
import {
  createConsoleLogger, Logger, WithLogger,
} from "../infrastructure/logger";
import { createHttpFetch, HttpFetch } from "../infrastructure/http";
import {
  CmeDataspecerPackageApi, useCmeDataspecerPackageApi,
} from "../infrastructure/dataspecer";
import { UrlQuery, useUrlQuery } from "./url-query";
import { WithCmeProviders } from "../core/cme-provider";

import { Header } from "../shell/header/header";
import { ThemeProvider } from "@user-interface/theme-provider";

import { WithCmeCommandExecutor } from "../core/cme-command";

import "./application.css";
import { Catalog } from "../shell/catalog/catalog";
import { WithApplicationState } from "../core/application/application-react";
import { EntityView } from "../shell/entity-view/entity-view";

/**
 * The main application ro render.
 */
export function Application() {
  const infrastructure = useMemo(createInfrastructure, []);

  const [query, setQuery] = useUrlQuery();

  // Without a package there is nothing to do!
  if (query.packageId === null) {
    return <MissingPackageIdentifier />;
  }

  // We have a package let us prepare the application context.

  const dataspecer = useCmeDataspecerPackageApi(
    infrastructure.logger,
    query.packageId,
    infrastructure.configuration.backend,
    infrastructure.http,
  );

  return (
    <WithCmeApplicationProviders
      infrastructure={infrastructure}
      dataspecer={dataspecer}
      setQuery={setQuery}
    >
      <ThemeProvider>
        <div className="h-svh flex flex-col">
          <Header activeVisualModel={query.viewId} />
          <div className="flex flex-1">
            <div className="w-100">
              <Catalog />
            </div>
            <div className="flex content-center justify-center flex-1">
              <EntityView />
            </div>
          </div>
        </div>
      </ThemeProvider>
    </WithCmeApplicationProviders>
  )
};

function createInfrastructure(): Infrastructure {
  const configuration = createCmeConfiguration();
  const logger = createConsoleLogger("trace");
  return {
    logger,
    http: createHttpFetch(),
    labelSelector: createLabelSelector(),
    configuration,
  }
}

interface Infrastructure {

  logger: Logger;

  http: HttpFetch;

  labelSelector: LabelSelector;

  configuration: CmeConfiguration;

}

function MissingPackageIdentifier() {
  return (
    <div className="h-full w-full flex flex-wrap content-center justify-center">
      <div>
        You have to specify a package using URL query argument!
      </div>
    </div>
  )
}

/**
 * A wrap component to move the providers outside the main function
 * for improver readability.
 */
function WithCmeApplicationProviders(props: {
  infrastructure: Infrastructure,
  dataspecer: CmeDataspecerPackageApi,
  setQuery: (value: Partial<UrlQuery>) => void,
  children: React.ReactNode,
}) {
  const { infrastructure, dataspecer, setQuery, children } = props;
  return (
    <WithLogger value={infrastructure.logger}>
      <WithLabelSelector value={infrastructure.labelSelector}>
        <WithCmeProviders
          dataspecer={dataspecer}
          logger={infrastructure.logger}
        >
          <WithCmeCommandExecutor
            logger={infrastructure.logger}
            dataspecer={dataspecer}
            setQuery={setQuery}
          >
            <WithApplicationState>
              {children}
            </WithApplicationState>
          </WithCmeCommandExecutor>
        </WithCmeProviders>
      </WithLabelSelector>
    </WithLogger>
  )
}
