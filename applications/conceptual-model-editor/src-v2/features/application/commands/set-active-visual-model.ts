import { ModelIdentifier } from "@dataspecer/core/model";
import { CmeCommandContext } from "../../../core/cme-command/cme-command-executor";
import { cmeCommandRegistry } from "../../../core/cme-command/cme-command-registry";
import { CommandReference } from "../../../core/cme-command/cme-command";

const IDENTIFIER = "core/set-active-visual-model";

cmeCommandRegistry.register({
  id: IDENTIFIER,
  title: {
    en: "Set active visual model"
  },
  description: {
    en: "Set active visual model.",
  },
  handler: (context, args: Arguments) =>
    setActiveVisualModelExecutor(context, args),
});

export function setActiveVisualModelCommand(
  args: Arguments,
): CommandReference<Arguments, void> {
  return {
    id: IDENTIFIER,
    args,
  }
}

interface Arguments {

  visualModel: ModelIdentifier;

}

function setActiveVisualModelExecutor(
  context: CmeCommandContext,
  args: Arguments,
) {
  context.application.setActiveVisualModel(args.visualModel);
}
