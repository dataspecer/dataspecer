import { SemanticModelAggregator, SemanticModelAggregatorView } from "@dataspecer/core-v2/semantic-model/aggregator";
import { VisualModel } from "@dataspecer/visual-model";
import { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

import { SemanticModelAggregatorType } from "../semantic-model";
import { updateUrlQuery } from "./url-query";
import { loadPackageModels } from "../dataspecer-service";
import { createDefaultWritableVisualModel } from "../visual-model/visual-model-factory";

/**
 * Keep in mind that models do not change!
 * When there is a change in a model, then the array change, but
 * not the values.
 */
export interface PackageState {

  /**
   * When this is null we are in a detach mode.
   */
  packageIdentifier: string | null;

  semanticAggregator: SemanticModelAggregatorType;

  semanticAggregatorView: SemanticModelAggregatorView;

  /**
   * List of all visual models in the package.
   */
  visualModels: VisualModel[];

  activeVisualModel: VisualModel | null;

  /**
   * List of all semantic models in the package.
   */
  semanticModels: EntityModel[];

}

/**
 * Can change URL query.
 */
export function initializePackageState(
  packageIdentifier: string | null,
  viewIdentifier: string | null,
  setPackageContext: (next: PackageState) => void,
): () => void {
  if (packageIdentifier === null) {
    return initializeStandalone(setPackageContext);
  } else {
    return initializeWithPackage(
      packageIdentifier, viewIdentifier, setPackageContext);
  }
}

/**
 * We are not saving data into any package, we run standalone mode.
 */
function initializeStandalone(
  setPackageContext: (next: PackageState) => void,
): () => void {
  // Default semantic model.
  const model = new InMemorySemanticModel();
  model.setAlias("My model");

  // Default view model.
  const visualModel = createDefaultWritableVisualModel([model]);

  // Aggregator.
  const semanticAggregator = new SemanticModelAggregator();
  semanticAggregator.addModel(model);
  semanticAggregator.addModel(visualModel);

  // Aggregator view.
  const semanticAggregatorView = semanticAggregator.getView();

  const context: PackageState = {
    packageIdentifier: null,
    semanticAggregator,
    semanticAggregatorView,
    visualModels: [visualModel],
    activeVisualModel: visualModel,
    semanticModels: [model],
  };

  setPackageContext(context);

  // This is synchronous action, there is no need to support cancel.
  return () => undefined;
}

/**
 * Can change URL query.
 */
function initializeWithPackage(
  packageIdentifier: string,
  viewIdentifier: string | null,
  setPackageContext: (next: PackageState) => void,
): () => void {
  // We use this to support cancel.
  let cancelled = false;

  createPackageContext(packageIdentifier, viewIdentifier)
    .then(packageContext => {
      if (cancelled) {
        return;
      }

      // Set context and update URL to make sure it is synced.
      setPackageContext(packageContext);

      // We also check for change in view identifier.
      const activeViewIdentifier =
        packageContext?.activeVisualModel?.getIdentifier() ?? null;
      if (viewIdentifier !== activeViewIdentifier) {
        updateUrlQuery(packageIdentifier, activeViewIdentifier);
      }
    });

  return () => {
    cancelled = true;
  };
}

async function createPackageContext(
  packageIdentifier: string, viewIdentifier: string | null,
): Promise<PackageState> {
  const [semanticModels, visualModels] =
    await loadPackageModels(packageIdentifier);

  // Visual model.
  const activeVisualModel =
    visualModels.find(item => item.getIdentifier() === viewIdentifier)
    ?? visualModels[0]
    ?? null;

  // Aggregator.
  const semanticAggregator = new SemanticModelAggregator();
  semanticModels.forEach(item => semanticAggregator.addModel(item));
  visualModels.forEach(item => semanticAggregator.addModel(item));

  // Aggregator view.
  const semanticAggregatorView = semanticAggregator.getView();

  return {
    packageIdentifier,
    semanticAggregator,
    semanticAggregatorView,
    visualModels,
    activeVisualModel,
    semanticModels,
  };
}

/**
 * Update visual model, does not change URL query.
 */
export function updatePackageStateActiveVisualModel(
  viewIdentifier: string | null,
  previous: PackageState,
  setPackageContext: (next: PackageState) => void,
) {

  const activeVisualModel =
    previous.visualModels.find(item => item.getIdentifier() === viewIdentifier)
    ?? previous.visualModels[0]
    ?? null;

  // Update only when necessary.
  if (activeVisualModel !== previous.activeVisualModel) {
    setPackageContext({
      ...previous,
      activeVisualModel,
    });
  }
}
