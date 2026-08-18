import { createRegistry } from "../shared/registry";
import { CmeCommand } from "./cme-command";

export const cmeCommandRegistry = createRegistry<CmeCommand<any, any>>();
