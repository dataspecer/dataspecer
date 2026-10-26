import { Logger } from "./logger";

export function createNoopLogger(): Logger {
  const logger: Logger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    critical: () => {},
    withTag: () => logger,
  };
  return logger;
}
