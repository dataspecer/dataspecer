import { useEffect, useMemo, useState } from "react";

import type { EntityModel } from "@dataspecer/core-v2/entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  type VisualModel,
  VisualModelDataVersion,
  type WritableVisualModel,
  isWritableVisualModel,
} from "@dataspecer/visual-model";
import {
  SemanticModelAggregator,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";

import { ClassesContextProvider } from "./context/classes-context";
import { ModelContextProvider } from "./context/model-context";
import Header from "./header/header";
import { useBackendConnection } from "./backend-connection";
import { Catalog as CatalogV3 } from "./catalog-v3/catalog";
import { Visualization } from "./visualization";
import { QueryParamsProvider, useQueryParamsContext } from "./context/query-params-context";
import { DialogContextProvider } from "./dialog/dialog-context";
import { DialogRenderer } from "./dialog/dialog-renderer";
import { NotificationList } from "./notification";
import { ActionsContextProvider } from "./action/actions-react-binding";
import { OptionsContextProvider } from "./configuration/options";

import { migrateVisualModelFromV0 } from "./dataspecer/visual-model/visual-model-v0-to-v1";
import { createDefaultWritableVisualModel } from "./dataspecer/visual-model/visual-model-factory";
import { VerticalSplitter } from "./components/vertical-splitter";
import { preferences, updatePreferences } from "./configuration";
import { sanitizeVisualModel } from "./dataspecer/visual-model/visual-model-sanitizer";
import {
  getDefaultUserGivenAlgorithmConfigurationsFull,
  UserGivenAlgorithmConfigurations,
} from "@dataspecer/layout";
import { LayoutConfigurationContext } from "./context/layout-configuration-context";

const _semanticModelAggregator = new SemanticModelAggregator();

type SemanticModelAggregatorType = typeof _semanticModelAggregator;

/** Select Catalog component. */
const Catalog = (() => {
  return CatalogV3;
})();

const Page = () => {
  // URL query
  const queryParamsContext = useQueryParamsContext();
  const { packageId, viewId } = queryParamsContext;
  // Dataspecer API
  const [aggregator] = useState(new SemanticModelAggregator());
  const [aggregatorView, setAggregatorView] = useState(aggregator.getView());

  const { getModelsFromBackend, getLayoutConfigurationModelFromBackend } = useBackendConnection();
  // Local state - models
  const [models, setModels] = useState<EntityModel[]>([]);
  const [visualModels, setVisualModels] = useState<WritableVisualModel[]>([]);

  const [layoutConfiguration, setLayoutConfiguration] =
    useState(getDefaultUserGivenAlgorithmConfigurationsFull());

  const layoutConfigurationContext = useMemo(() => {
    return {
      layoutConfiguration,
      setLayoutConfiguration,
    };
  }, [layoutConfiguration, setLayoutConfiguration]);

  // Runs on initial load.
  // If the app was launched without package-id query parameter
  // - creates a default entity model
  // - creates a view for it
  // - registers it with the aggregator
  // else -- the package-id (and view-id) params were provided
  // - downloads the models and views for given package from the backend
  // - deserializes them
  // - registers them at the aggregator
  // - if there was no local model within the package, it creates and registers one as well
  useEffect(() => {
    if (packageId === null) {
      console.log("[INITIALIZATION] Without a package.");
      // This is synchronous operation we do not need to cancel.
      initializeWithoutPackage(
        setVisualModels, setModels, aggregator, setAggregatorView);
    } else {
      console.log("[INITIALIZATION] Loading models for package.", { packageId });
      return initializeWithPackage(
        setVisualModels, setModels, aggregator, setAggregatorView,
        packageId, viewId,
        getModelsFromBackend,
        getLayoutConfigurationModelFromBackend,
        setLayoutConfiguration,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle browser navigation (back/forward) by changing the active visual model
  // when viewId changes in the URL
  useEffect(() => {
    if (aggregatorView === null) {
      return;
    }
    const currentActiveViewId = aggregatorView.getActiveViewId();
    if (currentActiveViewId === undefined) {
      // We are not ready yet.
      // When this is removed it caused the application failure.
      return;
    }
    if (viewId !== null && viewId !== currentActiveViewId) {
      console.log("Browser navigation detected, changing active visual model",
        { from: currentActiveViewId, to: viewId });
      aggregatorView.changeActiveVisualModel(viewId);
      setAggregatorView(aggregator.getView());
    }
  }, [viewId, aggregatorView, aggregator]);

  return (
    <ModelContextProvider
      aggregator={aggregator}
      aggregatorView={aggregatorView}
      setAggregatorView={setAggregatorView}
      models={models}
      setModels={setModels}
      visualModels={visualModels}
      setVisualModels={setVisualModels}
      queryParamsContext={queryParamsContext}
    >
      <ClassesContextProvider
        semanticModelsList={models}
        visualModelsList={visualModels}
        source={aggregatorView}
      >
        <LayoutConfigurationContext.Provider value={layoutConfigurationContext}>
          <DialogContextProvider>
            <ActionsContextProvider>
              <Header />
              <main className="w-full flex-grow bg-teal-50 md:h-[calc(100%-48px)]">
                <VerticalSplitter
                  className="h-full"
                  initialSize={preferences().pageSplitterValue}
                  onSizeChange={value => updatePreferences({ pageSplitterValue: value })}
                >
                  <Catalog />
                  <Visualization />
                </VerticalSplitter>
              </main>
              <NotificationList />
              <DialogRenderer />
            </ActionsContextProvider>
          </DialogContextProvider>
        </LayoutConfigurationContext.Provider>
      </ClassesContextProvider>
    </ModelContextProvider>
  );
};

// This is here for the query context to be provided
// so it can be used by the Page component.
const PageWrapper = () => {
  // Once ready we can add theme by
  // <ThemeProvider defaultTheme="dark" storageKey="dataspecer-cme-ui-theme">
  return (
    <QueryParamsProvider>
      <OptionsContextProvider>
        <Page />
      </OptionsContextProvider>
    </QueryParamsProvider>
  )
}

export default PageWrapper;

function initializeWithoutPackage(
  setVisualModels: (models: WritableVisualModel[]) => void,
  setModels: (models: EntityModel[]) => void,
  aggregator: SemanticModelAggregatorType,
  setAggregatorView: (value: SemanticModelAggregatorView) => void,
): void {
  // Create semantic model.
  const model = new InMemorySemanticModel();
  model.setAlias("Default local model");
  setModels([model]);

  // Create visual model.
  const visualModel = createDefaultWritableVisualModel([model]);
  setVisualModels([visualModel]);

  // Create aggregator.
  aggregator.addModel(model);
  aggregator.addModel(visualModel);

  const aggregatorView = aggregator.getView();
  aggregatorView.changeActiveVisualModel(visualModel.getId());

  setAggregatorView(aggregatorView);
}

function initializeWithPackage(
  setVisualModels: (models: WritableVisualModel[]) => void,
  setModels: (models: EntityModel[]) => void,
  aggregator: SemanticModelAggregatorType,
  setAggregatorView: (value: SemanticModelAggregatorView) => void,
  //
  packageId: string,
  viewId: string | null,
  //
  getModelsFromBackend: (packageId: string) => Promise<readonly [EntityModel[], VisualModel[]]>,
  getLayoutConfigurationModelFromBackend: (packageIdentifier: string) => Promise<UserGivenAlgorithmConfigurations>,
  setLayoutConfiguration: (value: UserGivenAlgorithmConfigurations) => void,
): () => void {
  let cancelled = false;


  // Layout configuration

  getLayoutConfigurationModelFromBackend(packageId).then((configuration) => {
    if (cancelled) {
      return;
    }
    setLayoutConfiguration(configuration);
  }).catch((error) => {
    console.error("Can not load configuration for layouting.", error);
  });

  // Package models.

  getModelsFromBackend(packageId).then((models) => {
    if (cancelled) {
      return;
    }
    const [entityModels, visualModels] = models;
    if (entityModels.length === 0) {
      console.info("Creating default semantic model.");
      const model = new InMemorySemanticModel();
      model.setAlias("Default local model");
      entityModels.push(model);
    }

    if (visualModels.length === 0) {
      console.info("Creating default visual model.");
      const visualModel = createDefaultWritableVisualModel(entityModels);
      visualModels.push(visualModel);
    }

    if (!entityModels.find((model) => model instanceof InMemorySemanticModel)) {
      console.info("No semantic model found in the package, creating a default semantic model.");
      const model = new InMemorySemanticModel();
      model.setAlias("Default local model");
      entityModels.push(model);
    }

    // Add models to aggregator.
    for (const model of visualModels) {
      aggregator.addModel(model);
    }

    for (const model of entityModels) {
      aggregator.addModel(model);
    }

    const aggregatorView = aggregator.getView();

    // Perform high-level migration.
    for (const model of visualModels) {
      if (!isWritableVisualModel(model)) {
        // We can not perform migration in read-only models.
        continue;
      }
      if (model.getInitialModelVersion() === VisualModelDataVersion.VERSION_0) {
        migrateVisualModelFromV0(entityModels, aggregatorView.getEntities(), model);
      }
      sanitizeVisualModel(entityModels, aggregatorView.getEntities(), model);
    }

    // Set models to state.
    setModels(entityModels);
    // The cast here is not good but fixing it would cause
    // huge ripple effect.
    setVisualModels(visualModels as WritableVisualModel[]);

    const availableVisualModelIds = visualModels.map((model) => model.getIdentifier());

    // Select active visual model.
    if (viewId && availableVisualModelIds.includes(viewId)) {
      aggregatorView.changeActiveVisualModel(viewId);
    } else {
      // Choose the first available model.
      const identifier = visualModels.at(0)?.getIdentifier();
      if (identifier !== undefined) {
        aggregatorView.changeActiveVisualModel(identifier);
      }
    }

    setAggregatorView(aggregatorView);
  }).catch((error) => {
    console.error("Can not prepare package.", error);
  });

  return () => {
    cancelled = true;
  };
}
