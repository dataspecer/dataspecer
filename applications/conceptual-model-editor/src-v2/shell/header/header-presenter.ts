import { CmeCommandExecutor } from "../../core/cme-command";
import {
  savePackageAndCloseCommand,
  savePackageCommand,
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
    onExport(type) {
      // TODO
    },
  };
}
