import { LanguageString } from "../../shared/types";
import { CmeCommandContext } from "./cme-command-executor";

export interface CmeCommand<ArgType, ResultType> {

  /**
   * Uniq command identifier.
   */
  id: string;

  /**
   * Command title.
   */
  title: LanguageString;

  /**
   * Human readable description.
   */
  description: LanguageString;

  /**
   * Handler used to invoke the command.
   */
  handler: (context: CmeCommandContext, args: ArgType)
    => ResultType | Promise<ResultType>;

}

/**
 * Reference to a command.
 */
export interface CommandReference<ArgType, ResultType> {

  /**
   * Uniq command identifier.
   */
  id: string;

	args: ArgType;

};
