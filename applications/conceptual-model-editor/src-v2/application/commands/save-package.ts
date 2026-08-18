import {
  CmeCommandContext, cmeCommandRegistry, CommandReference,
} from "../../core/cme-command";

const IDENTIFIER = "application/save";

cmeCommandRegistry.register({
  id: IDENTIFIER,
  title: {
    en: "Save"
  },
  description: {
    en: "Save all data to backend.",
  },
  handler: (context) =>
    savePackageExecutor(context),
});

export function savePackageCommand(
): CommandReference<undefined, Promise<void>> {
  return {
    id: IDENTIFIER,
    args: undefined,
  }
}

function savePackageExecutor(context: CmeCommandContext) {
  return context.dataspecer.saveByOverride();
}
