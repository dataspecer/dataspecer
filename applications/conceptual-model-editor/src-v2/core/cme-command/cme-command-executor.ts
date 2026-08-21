import { ModelIdentifier } from "@dataspecer/core/model";
import { CmeDataspecerPackageApi } from "../../infrastructure/dataspecer";
import { CommandReference } from "./cme-command";

export interface CmeCommandExecutor {

  /**
   * Execute referenced command.
   * @throws Error when no command of given identifier is provided.
   */
  execute<ArgsType, ResultType>(
    command: CommandReference<ArgsType, ResultType>,
  ): ResultType;

}

/**
 * Every command is given this context for execution.
 */
export interface CmeCommandContext extends CmeCommandExecutor {

  setActiveVisualModel(visualModel: ModelIdentifier): void;

  dataspecer: CmeDataspecerPackageApi;

}
