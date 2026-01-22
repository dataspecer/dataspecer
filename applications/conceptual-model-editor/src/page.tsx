import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

import type { Entity, EntityModel } from "@dataspecer/core-v2/entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  type VisualModel,
  VisualModelDataVersion,
  type WritableVisualModel,
  isVisualModel,
  isWritableVisualModel,
} from "@dataspecer/visual-model";
import {
  type AggregatedEntityWrapper,
  SemanticModelAggregator,
  type SemanticModelAggregatorView,
} from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { ClassesContext } from "./context/classes-context";
import { ModelGraphContext } from "./context/model-context";
import Header from "./header/header";
import { useBackendConnection } from "./backend-connection";
import { Catalog as CatalogV1 } from "./catalog/catalog";
import { Catalog as CatalogV2 } from "./catalog-v2/catalog";
import { Visualization } from "./visualization";
import { bothEndsHaveAnIri } from "./util/relationship-utils";
import { QueryParamsProvider, useQueryParamsContext } from "./context/query-params-context";
import { DialogContextProvider } from "./dialog/dialog-context";
import { DialogRenderer } from "./dialog/dialog-renderer";
import { NotificationList } from "./notification";
import { ActionsContextProvider } from "./action/actions-react-binding";
import { OptionsContextProvider } from "./configuration/options";

import { migrateVisualModelFromV0 } from "./dataspecer/visual-model/visual-model-v0-to-v1";
import { ExplorationContextProvider } from "./context/highlighting-exploration-mode";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createDefaultWritableVisualModel } from "./dataspecer/visual-model/visual-model-factory";
import { VerticalSplitter } from "./components/vertical-splitter";
import { preferences, updatePreferences } from "./configuration";
import { sanitizeVisualModel } from "./dataspecer/visual-model/visual-model-sanitizer";
import { getDefaultUserGivenAlgorithmConfigurationsFull, UserGivenAlgorithmConfigurations } from "@dataspecer/layout";
import { LayoutConfigurationContext } from "./context/layout-configuration-context";
import { CmeSemanticModelProvider } from "./dataspecer/cme-semantic-model";
import { CmeProfileModelProvider } from "./dataspecer/cme-profile-model";
import { CmeAggregateModelContextProvider } from "./dataspecer/cme-aggregate-model";

const _semanticModelAggregator = new SemanticModelAggregator();
type SemanticModelAggregatorType = typeof _semanticModelAggregator;

/** Select Catalog component. */
const Catalog = (() => {
  const params = new URLSearchParams(window.location.search);
  const catalog = params.get("dev-catalog");
  if (catalog === "v1" || catalog === "v2") {
    updatePreferences({ catalogComponent: catalog });
  }
  switch (preferences().catalogComponent) {
  case "v1":
    return CatalogV1;
  case "v2":
    return CatalogV2
  }
})();

const Page = () => {
  // URL query
  const { packageId, viewId, updatePackageId, updateViewId } = useQueryParamsContext();
  // Dataspecer API
  const [aggregator, setAggregator] = useState(new SemanticModelAggregator());
  const [aggregatorView, setAggregatorView] = useState(aggregator.getView());
  const { getModelsFromBackend, getLayoutConfigurationModelFromBackend } = useBackendConnection();
  // Local state
  const [models, setModels] = useState(new Map<string, EntityModel>());
  const [classes, setClasses] = useState<SemanticModelClass[]>([]);
  const [allowedClasses, setAllowedClasses] = useState<string[]>([]);
  const [relationships, setRelationships] = useState<SemanticModelRelationship[]>([]);
  const [generalizations, setGeneralizations] = useState<SemanticModelGeneralization[]>([]);
  const [rawEntities, setRawEntities] = useState<(Entity | null)[]>([]);
  const [visualModels, setVisualModels] = useState(new Map<string, WritableVisualModel>());
  const [sourceModelOfEntityMap, setSourceModelOfEntityMap] = useState(new Map<string, string>());
  const [defaultModelAlreadyCreated, setDefaultModelAlreadyCreated] = useState(false);
  const [classProfiles, setClassProfiles] = useState<SemanticModelClassProfile[]>([]);
  const [relationshipProfiles, setRelationshipProfiles] = useState<SemanticModelRelationshipProfile[]>([]);
  const [
    layoutConfiguration,
    setLayoutConfiguration
  ] = useState<UserGivenAlgorithmConfigurations>(getDefaultUserGivenAlgorithmConfigurationsFull());

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
      if (defaultModelAlreadyCreated) {
        // We have already created a default package.
        return;
      } else {
        console.log("[INITIALIZATION] No package identifier provided, creating default model.");
        return initializeWithoutPackage(
          setVisualModels,
          setModels,
          setDefaultModelAlreadyCreated,
          setAggregator,
          setAggregatorView);
      }
    } else {
      console.log("[INITIALIZATION] Loading models for package.", { packageId });
      return initializeWithPackage(
        packageId, viewId, aggregator,
        getModelsFromBackend,
        getLayoutConfigurationModelFromBackend,
        setLayoutConfiguration,
        setVisualModels,
        setModels,
        setAggregatorView,
        updatePackageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registers a subscription callback at the aggregator, that:
  // - removes whatever was removed from the models registered at the aggregator from the `ClassContext`
  // - goes through the updated elements
  // - based on their types puts them to their respective buckets - classes, relationships, etc
  useEffect(() => {
    if (aggregatorView === null) {
      return;
    }

    const callback = (updated: AggregatedEntityWrapper[], removed: string[]) => {
      propagateAggregatorChangesToLocalState(
        updated, removed,
        setClasses, setRelationships,
        setGeneralizations, setRawEntities,
        setSourceModelOfEntityMap,
        setClassProfiles, setRelationshipProfiles,
        aggregatorView);
    };
    return aggregatorView?.subscribeToChanges(callback);

  }, [aggregatorView]);

  // Sync URL viewId changes (from browser back/forward) to aggregator view
  useEffect(() => {
    if (!aggregatorView) {
      return;
    }

    const currentActiveViewId = aggregatorView.getActiveViewId();
    
    // Only change if viewId from URL is different from current active view
    if (viewId !== currentActiveViewId) {
      const availableVisualModels = aggregatorView.getAvailableVisualModels();
      const isValidViewId = viewId && availableVisualModels.some(vm => vm.getIdentifier() === viewId);
      
      if (isValidViewId) {
        console.log("[VIEW NAVIGATION] Syncing URL viewId to aggregator:", viewId);
        aggregatorView.changeActiveVisualModel(viewId);
        setAggregatorView(aggregator.getView());
      }
    }
  }, [viewId, aggregatorView, aggregator]);

  // Set initial view-id in URL if not present
  useEffect(() => {
    if (!aggregatorView || viewId) {
      // Either no view yet or URL already has view-id
      return;
    }

    const currentActiveViewId = aggregatorView.getActiveViewId();
    if (currentActiveViewId) {
      console.log("[VIEW NAVIGATION] Setting initial view-id in URL:", currentActiveViewId);
      updateViewId(currentActiveViewId);
    }
  }, [aggregatorView, viewId, updateViewId]);

  return (
    <ExplorationContextProvider>
      <OptionsContextProvider>
        <ModelGraphContext.Provider
          value={{
            aggregator,
            aggregatorView,
            setAggregatorView,
            models,
            setModels,
            visualModels,
            setVisualModels,
          }}
        >
          <ClassesContext.Provider
            value={{
              classes,
              allowedClasses,
              setAllowedClasses,
              relationships,
              generalizations,
              sourceModelOfEntityMap,
              rawEntities,
              classProfiles,
              relationshipProfiles,
            }}
          >
            <CmeSemanticModelProvider semanticModels={models}>
              <CmeProfileModelProvider profileModels={models}>
                <CmeAggregateModelContextProvider>
                  <LayoutConfigurationContext.Provider
                    value={{
                      layoutConfiguration,
                      setLayoutConfiguration,
                    }}>
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
                </CmeAggregateModelContextProvider>
              </CmeProfileModelProvider>
            </CmeSemanticModelProvider>
          </ClassesContext.Provider>
        </ModelGraphContext.Provider>
      </OptionsContextProvider >
    </ExplorationContextProvider >
  );
};

// This is here for the query context to be provided
// so it can be used by the Page component.
const PageWrapper = () => {
  // Once ready we can add theme by
  // <ThemeProvider defaultTheme="dark" storageKey="dataspecer-cme-ui-theme">
  return (
    <QueryParamsProvider>
      <Page />
    </QueryParamsProvider>
  )
}

export default PageWrapper;

function initializeWithoutPackage(
  setVisualModels: Dispatch<SetStateAction<Map<string, WritableVisualModel>>>,
  setModels: Dispatch<SetStateAction<Map<string, EntityModel>>>,
  setDefaultModelAlreadyCreated: Dispatch<SetStateAction<boolean>>,
  setAggregator: Dispatch<SetStateAction<SemanticModelAggregatorType>>,
  setAggregatorView: Dispatch<SetStateAction<SemanticModelAggregatorView>>,
) {
  const tempAggregator = new SemanticModelAggregator();

  // Create semantic model.
  const model = new InMemorySemanticModel();
  model.setAlias("Default local model");
  setModels(new Map([[model.getId(), model]]));
  tempAggregator.addModel(model);

  // Create visual model.
  const visualModel = createDefaultWritableVisualModel([model]);
  setVisualModels(new Map([[visualModel.getId(), visualModel]]));
  tempAggregator.addModel(visualModel);
  const tempAggregatorView = tempAggregator.getView();
  tempAggregatorView.changeActiveVisualModel(visualModel.getId());

  setDefaultModelAlreadyCreated(true);
  setAggregator(tempAggregator);
  setAggregatorView(tempAggregatorView);

  return () => {
    setDefaultModelAlreadyCreated(false);
    setModels(() => new Map<string, EntityModel>());
    setVisualModels(() => new Map<string, WritableVisualModel>());
  };
}

function initializeWithPackage(
  packageId: string,
  viewId: string | null,
  aggregator: SemanticModelAggregatorType,
  getModelsFromBackend: (packageId: string) => Promise<readonly [EntityModel[], VisualModel[]]>,
  getLayoutConfigurationModelFromBackend: (packageIdentifier: string) => Promise<UserGivenAlgorithmConfigurations>,
  setLayoutConfiguration: Dispatch<SetStateAction<UserGivenAlgorithmConfigurations>>,
  setVisualModels: Dispatch<SetStateAction<Map<string, WritableVisualModel>>>,
  setModels: Dispatch<SetStateAction<Map<string, EntityModel>>>,
  setAggregatorView: Dispatch<SetStateAction<SemanticModelAggregatorView>>,
  updatePackageId: (packageId: string | null) => void,
) {
  const getLayoutConfiguration = () => getLayoutConfigurationModelFromBackend(packageId);
  // I think that no clean up is needed (as in case of models), since we are always setting with concrete value
  getLayoutConfiguration().then((layoutConfiguration) => {
    setLayoutConfiguration(layoutConfiguration);
  }).catch((error) => {
    console.error("Can not load configuration for layouting. Using the default", error);
    setLayoutConfiguration(getDefaultUserGivenAlgorithmConfigurationsFull());
  });

  const getModels = () => getModelsFromBackend(packageId);

  const cleanup = getModels().then((models) => {
    const [entityModels, visualModels] = models;
    if (entityModels.length === 0) {
      console.warn("Creating default semantic model.");
      const model = new InMemorySemanticModel();
      model.setAlias("Default local model");
      entityModels.push(model);
    }

    if (visualModels.length === 0) {
      console.warn("Creating default visual model.");
      const visualModel = createDefaultWritableVisualModel(entityModels);
      visualModels.push(visualModel);
    }

    if (!entityModels.find((m) => m instanceof InMemorySemanticModel)) {
      console.warn("No semantic model found in the package, creating a default model.");

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
    const visualModelsMap = new Map(visualModels.map((model) => [model.getIdentifier(), model as WritableVisualModel]));
    const entityModelsMap = new Map(entityModels.map((model) => [model.getId(), model]));

    // Perform high-level migration.
    for (const model of visualModels) {
      if (!isWritableVisualModel(model)) {
        // We can not perform migration in read-only models.
        continue;
      }
      if (model.getInitialModelVersion() === VisualModelDataVersion.VERSION_0) {
        migrateVisualModelFromV0(entityModelsMap, aggregatorView.getEntities(), model);
      }
      sanitizeVisualModel(entityModels, aggregatorView.getEntities(), model);
    }

    // Set models to state.
    setVisualModels(visualModelsMap);
    setModels(entityModelsMap);

    const availableVisualModelIds = visualModels.map((model) => model.getIdentifier());

    // Select active visual model.
    if (viewId && availableVisualModelIds.includes(viewId)) {
      aggregatorView.changeActiveVisualModel(viewId);
    } else {
      // Choose the first available model.
      const modelId = visualModels.at(0)?.getIdentifier();
      if (modelId) {
        aggregatorView.changeActiveVisualModel(modelId);
      }
    }

    setAggregatorView(aggregatorView);

    return () => {
      console.log("Cleanup for the package loading method.");
      for (const model of [...entityModels, ...visualModels]) {
        try {
          aggregator.deleteModel(model);
        } catch (err) {
          console.log("Can't delete model from aggregator.", err);
        }
      }
      setModels(new Map());
      setVisualModels(new Map());
    };
  }).catch((error) => {
    console.error("Can not prepare package.", error);
    updatePackageId(null);
  });

  return async () => {
    (await cleanup)?.();
  };
}

function propagateAggregatorChangesToLocalState(
  updated: AggregatedEntityWrapper[],
  removed: string[],
  // Local state.
  setClasses: Dispatch<SetStateAction<SemanticModelClass[]>>,
  setRelationships: Dispatch<SetStateAction<SemanticModelRelationship[]>>,
  setGeneralizations: Dispatch<SetStateAction<SemanticModelGeneralization[]>>,
  setRawEntities: Dispatch<SetStateAction<(Entity | null)[]>>,
  setSourceModelOfEntityMap: Dispatch<SetStateAction<Map<string, string>>>,
  setClassProfiles: Dispatch<SetStateAction<SemanticModelClassProfile[]>>,
  setRelationshipProfiles: Dispatch<SetStateAction<SemanticModelRelationshipProfile[]>>,
  aggregator: SemanticModelAggregatorView,
) {

  // Prepare update.
  const localSourceMap = new Map<string, string>();
  const {
    updatedClasses,
    updatedRelationships,
    updatedGeneralizations,
    updatedRawEntities,
    updatedClassProfiles,
    updatedRelationshipProfiles,
  } = updated.reduce(
    (
      {
        updatedClasses,
        updatedRelationships,
        updatedGeneralizations,
        updatedRawEntities,
        updatedClassProfiles,
        updatedRelationshipProfiles,
      },
      curr
    ) => {
      //
      if (isSemanticModelClass(curr.aggregatedEntity)) {
        return {
          updatedClasses: updatedClasses.concat(curr.aggregatedEntity),
          updatedRelationships,
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelRelationship(curr.aggregatedEntity)) {
        if (bothEndsHaveAnIri(curr.aggregatedEntity)) {
          console.warn(
            "Both ends have an IRI, skipping.",
            curr.aggregatedEntity,
            curr.aggregatedEntity.ends
          );
          return {
            updatedClasses,
            updatedRelationships,
            updatedGeneralizations,
            updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
            updatedClassProfiles,
            updatedRelationshipProfiles,
          };
        }
        return {
          updatedClasses,
          updatedRelationships: updatedRelationships.concat(curr.aggregatedEntity),
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelGeneralization(curr.aggregatedEntity)) {
        return {
          updatedClasses,
          updatedRelationships,
          updatedGeneralizations: updatedGeneralizations.concat(curr.aggregatedEntity),
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelClassProfile(curr.aggregatedEntity)) {
        return {
          updatedClasses,
          updatedRelationships,
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles: updatedClassProfiles.concat(curr.aggregatedEntity),
          updatedRelationshipProfiles,
        };
      } else if (isSemanticModelRelationshipProfile(curr.aggregatedEntity)) {
        return {
          updatedClasses,
          updatedRelationships,
          updatedGeneralizations,
          updatedRawEntities: updatedRawEntities.concat(curr.rawEntity),
          updatedClassProfiles,
          updatedRelationshipProfiles: updatedRelationshipProfiles.concat(curr.aggregatedEntity),
        };
      } else {
        console.error("Unknown type of updated entity", curr.aggregatedEntity);
        throw new Error("Unknown type of updated entity.");
      }
    },
    {
      updatedClasses: [] as SemanticModelClass[],
      updatedRelationships: [] as SemanticModelRelationship[],
      updatedGeneralizations: [] as SemanticModelGeneralization[],
      updatedRawEntities: [] as (Entity | null)[],
      updatedClassProfiles: [] as SemanticModelClassProfile[],
      updatedRelationshipProfiles: [] as SemanticModelRelationshipProfile[],
    }
  );

  const models = aggregator.getModels();
  for (const model of models.values()) {
    const modelId = model.getId();
    if (isVisualModel(model)) {
      // We ignore those.
      continue;
    }
    Object.values(model.getEntities()).forEach((e) => localSourceMap.set(e.id, modelId));
  }
  setSourceModelOfEntityMap(new Map(localSourceMap));

  // Update local state.
  const removedIds = new Set(removed);
  setClasses(prev => updateItems(prev, removedIds, updatedClasses));
  setRelationships(prev => updateItems(prev, removedIds, updatedRelationships));
  setGeneralizations(prev => updateItems(prev, removedIds, updatedGeneralizations));
  setRawEntities(prev => updateItems(
    prev.filter(item => item !== null),
    removedIds,
    updatedRawEntities.filter(item => item !== null)));
  setClassProfiles(prev => updateItems(prev, removedIds, updatedClassProfiles));
  setRelationshipProfiles(prev => updateItems(prev, removedIds, updatedRelationshipProfiles));
}

function updateItems<Type extends { id: string }>(items: Type[], removed: Set<string>, changed: Type[]): Type[] {
  if (removed.size === 0 && changed.length === 0) {
    return items;
  }
  // Remove
  let result = items.filter(item => !removed.has(item.id));
  // Build change map.
  const changeMap: Record<string, Type | null> = {};
  changed.forEach(item => changeMap[item.id] = item);
  // Update and remove from change map.
  result = result.map((item) => {
    const next = changeMap[item.id];
    if (next === undefined) {
      return item;
    } else {
      changeMap[item.id] = null;
      return next!;
    }
  });
  // Add non-null items as new.
  Object.values(changeMap).filter(item => item !== null)
    .forEach(item => result.push(item));
  return result;
}
