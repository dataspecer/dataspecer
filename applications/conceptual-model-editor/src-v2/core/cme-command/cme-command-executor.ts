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

  application: CmeApplicationEnvironment;

  dataspecer: CmeDataspecerPackageApi;

}

/**
 * Shell-owned commands with requiring top level application access.
 * This is not a dump for arbitrary UI actions (dialogs, toasts, ...);
 * those should have their own provider and registry.
 */
export interface CmeApplicationEnvironment {

  setActiveVisualModel(visualModel: ModelIdentifier): void;

}
