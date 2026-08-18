import {
  CmeCommandContext, cmeCommandRegistry, CommandReference,
} from "../../core/cme-command";
import { savePackageCommand } from "./save-package";

const IDENTIFIER = "application/save-and-close";

cmeCommandRegistry.register({
  id: IDENTIFIER,
  title: {
    en: "Save and close"
  },
  description: {
    en: "Save all data to backend and navigate back to manager.",
  },
  handler: (context) =>
    savePackageAndCloseExecutor(context),
});

export function savePackageAndCloseCommand(
): CommandReference<undefined, Promise<void>> {
  return {
    id: IDENTIFIER,
    args: undefined,
  }
}

const DATASPECER_MANAGER_URL = import.meta.env.VITE_PUBLIC_MANAGER_PATH;

async function savePackageAndCloseExecutor(context: CmeCommandContext) {
  await context.execute(savePackageCommand());
  //
  const link = document.createElement("a");
  link.setAttribute("href", DATASPECER_MANAGER_URL);
  link.click();
}
