import { ModelIdentifier } from "@dataspecer/core/model";
import {
  CmeCommandContext, cmeCommandRegistry, CommandReference,
} from "../../core/cme-command";

const IDENTIFIER = "application/set-active-visual-model";

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
  context.setActiveVisualModel(args.visualModel);
}
