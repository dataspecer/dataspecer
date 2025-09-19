import { EntityModel } from "@dataspecer/core-v2";
import { ModelDsIdentifier } from "../entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { PackageState } from "./package-state";
import { createLogger } from "../../application";
import { DataspecerError } from "../dataspecer-error";
import { removeFromArray } from "../../utilities/functional";
import { updateUrlQuery } from "./url-query";
import { savePackageModels } from "../dataspecer-service";
import { VisualModel } from "@dataspecer/visual-model";

const LOG = createLogger(import.meta.url);

/**
 * Interface for working with package data.
 */
export interface PackageApi {

  /**
   * Add an existing visual model to the package.
   * Changes are not synchronized to backend.
   */
  addVisualModel: (model: VisualModel) => ModelDsIdentifier;

  /**
   * Update metadata about the visual model.
   * Changes are not synchronized to backend.
   */
  updateVisualModel: (identifier: ModelDsIdentifier, label: LanguageString) => void;

  /**
   * Set active visual model, this information is saved only in local memory.
   * And is not synchronized to backend.
   */
  setActiveVisualModel: (identifier: ModelDsIdentifier) => void;

  /**
   * Remove visual model.
   * Changes are not synchronized to backend.
   */
  removeVisualModel: (identifier: ModelDsIdentifier) => void;

  /**
   * Add an exiting semantic model to the package.
   * Changes are not synchronized to backend.
   */
  addSemanticModel: (model: EntityModel) => void;

  /**
   * Remove semantic model.
   * Changes are not synchronized to backend.
   */
  removeSemanticModel: (identifier: ModelDsIdentifier) => void;

  /**
   * Synchronize changes to backend.
   */
  save: () => Promise<void>;

  /**
   * Update semantic model metadata.
   * Changes are not synchronized to backend.
   */
  updateSemanticModel: (
    model: EntityModel, alias: string) => void;

  /**
   * Update InMemory semantic model metadata.
   * Changes are not synchronized to backend.
   */
  updateInMemorySemanticModel: (
    model: InMemorySemanticModel, alias: string, baseIri: string) => void;

}

export function createPackageContextApi(
  getPrevious: () => PackageState | null,
  setNext: (next: PackageState) => void,
): PackageApi {

  // We are using this method to get previous state.
  // This should be fine as we are using ref, but should React
  // decide to execute update in an unexpected way, it may be an issue.
  //
  // We could use setNext with callback, but it would complicate the code
  // bellow and for now this seems to work.
  const withPrevious = <T>(callback: (prev: PackageState) => T) => {
    const previous = getPrevious();
    if (previous === null) {
      LOG.warn("Ignored API call on package as the state is null.");
      throw new DataspecerError("dataspecer.package.state-is-null");
    } else {
      return callback(previous);
    }
  };

  //

  const addVisualModel = (model: VisualModel) => withPrevious(prev => {
    setNext({
      ...prev,
      visualModels: [...prev.visualModels, model],
    });
    return model.getIdentifier();
  });

  const updateVisualModel = (identifier: ModelDsIdentifier, label: LanguageString) => withPrevious(prev => {
    const index = prev.visualModels.findIndex(item => item.getIdentifier() === identifier);
    if (index === -1) {
      LOG.warn("Ignored visual model update as the model is missing.", { identifier });
      throw new DataspecerError("dataspecer.package.missing-model");
    }
    const model = prev.visualModels[index];
    model.setLabel(label);
    // We just refresh the array, values are the same.
    setNext({
      ...prev,
      visualModels: [...prev.visualModels],
    });
  });

  const setActiveVisualModel = (identifier: ModelDsIdentifier) => withPrevious(prev => {
    const index = prev.visualModels.findIndex(item => item.getIdentifier() === identifier);
    if (index === -1) {
      LOG.warn("Ignored active visual model change as the model is missing.", { identifier });
      throw new DataspecerError("dataspecer.package.missing-model");
    }
    //
    setNext({
      ...prev,
      activeVisualModel: prev.visualModels[index],
    });
  });

  const removeVisualModel = (identifier: ModelDsIdentifier) => withPrevious(prev => {
    const index = prev.visualModels.findIndex(item => item.getIdentifier() === identifier);
    if (index === -1) {
      LOG.warn("Ignored delete of non-existing visual model.", { identifier });
      // We just refresh the array, this should reload derived
      // state and possibly fix the cause of this issue.
      setNext({
        ...prev,
        visualModels: [...prev.visualModels],
      });
      return;
    }
    // Prepare new array of visual models.
    const model = prev.visualModels[index];
    const visualModels = removeFromArray(model, prev.visualModels);

    // Check we have not deleted the current active visual model.
    let activeVisualModel = prev.activeVisualModel;
    if (activeVisualModel === model) {
      activeVisualModel = visualModels[0] ?? null;
      // We also update the URL.
      updateUrlQuery(
        prev.packageIdentifier,
        activeVisualModel?.getIdentifier() ?? null);
    }

    setNext({
      ...prev,
      activeVisualModel,
      visualModels,
    });
  });

  const addSemanticModel = (model: EntityModel) => withPrevious(prev => {
    prev.semanticAggregator.addModel(model);
    setNext({
      ...prev,
      semanticModels: [...prev.semanticModels, model],
    });
  });

  const removeSemanticModel = (identifier: ModelDsIdentifier) => withPrevious(prev => {
    const index = prev.semanticModels.findIndex(item => item.getId() === identifier);
    if (index === -1) {
      LOG.warn("Ignored delete of non-existing model.", { identifier });
      // We just refresh the array, this should reload derived
      // state and possibly fix the cause of this issue.
      setNext({
        ...prev,
        visualModels: [...prev.visualModels],
      });
      return;
    }
    //
    const model = prev.semanticModels[index];
    prev.semanticAggregator.deleteModel(model);
    setNext({
      ...prev,
      semanticModels: removeFromArray(model, prev.semanticModels),
    });
  });

  const save = async () => withPrevious(prev => {
    if (prev.packageIdentifier === null) {
      LOG.warn("Can not save in detached mode.");
      throw new DataspecerError("dataspecer.package.can-not-save-in-detached-mode")
    }
    savePackageModels(prev.packageIdentifier, prev.semanticModels, prev.visualModels);
  });

  const updateSemanticModel = (model: EntityModel, alias: string) => withPrevious(prev => {
    const index = prev.semanticModels.findIndex(item => item === model);
    if (index === -1) {
      LOG.warn("Ignored update of unknown model.", { model });
      throw new DataspecerError("dataspecer.package.missing-model");
    }
    //
    model.setAlias(alias);
    // We just refresh the array.
    setNext({
      ...prev,
      semanticModels: [...prev.semanticModels],
    });
  });

  const updateInMemorySemanticModel =
    (model: InMemorySemanticModel, alias: string, baseIri: string) => withPrevious(prev => {
      const index = prev.semanticModels.findIndex(item => item === model);
      if (index === -1) {
        LOG.warn("Ignored update of unknown model.", { model });
        throw new DataspecerError("dataspecer.package.missing-model");
      }
      //
      model.setAlias(alias);
      model.setBaseIri(baseIri);
      // We just refresh the array.
      setNext({
        ...prev,
        semanticModels: [...prev.semanticModels],
      });
    });

  return {
    addVisualModel,
    updateVisualModel,
    setActiveVisualModel,
    removeVisualModel,
    addSemanticModel,
    removeSemanticModel,
    save,
    updateSemanticModel,
    updateInMemorySemanticModel,
  }
}
