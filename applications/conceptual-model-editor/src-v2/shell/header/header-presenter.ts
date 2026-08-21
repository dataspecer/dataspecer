import { ModelIdentifier } from "@dataspecer/core/model";
import { CmeCommandExecutor } from "../../core/cme-command";
import {
  savePackageAndCloseCommand,
  savePackageCommand,
  setActiveVisualModelCommand,
} from "../../application/commands";

export interface HeaderPresenter {

  /**
   * Save current state to a backend.
   */
  onSave: () => void;

  /**
   * Save current state to a backend and navigate back to Dataspecer manager.
   */
  onSaveAndClose: () => void;

  /**
   * Select new active visual model.
   */
  onSetActiveVisualModel: (identifier: ModelIdentifier) => void;

  /**
   * Open dialog to create a new visual model.
   */
  onCreateVisualModel: () => void;

  /**
   * Open a dialog to adit a new visual model.
   */
  onEditVisualModel: (identifier: ModelIdentifier) => void;

  /**
   * Delete selected visual model.
   */
  onDeleteVisualModel: (identifier: ModelIdentifier) => void;

  /**
   * Trigger export in a selected format.
   * TODO : Should be replaced with a dialog.
   */
  onExport: (type: "svg" | "rdfs/owl" | "dsv" | "shacl") => void;

}

export function createHeaderPresenter(
  commandExecutor: CmeCommandExecutor,
): HeaderPresenter {
  return {
    onSave() {
      commandExecutor.execute(savePackageCommand());
    },
    onSaveAndClose() {
      commandExecutor.execute(savePackageAndCloseCommand());
    },
    onSetActiveVisualModel(identifier) {
      commandExecutor.execute(setActiveVisualModelCommand({
        visualModel: identifier,
      }));
    },
    onCreateVisualModel() {
      // TODO
    },
    onEditVisualModel(identifier) {
      // TODO
    },
    onDeleteVisualModel(identifier) {
      // TODO
    },
    onExport(type) {
      // TODO
    },
  };
}
