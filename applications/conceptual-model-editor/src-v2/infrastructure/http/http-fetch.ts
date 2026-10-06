import { HttpFetch as FetchApi } from "@dataspecer/core/io/fetch/fetch-api";
import { Logger } from "../logger";

/**
 * Create instance of HTTP fetch API.
 */
export function createHttpFetch(options?: {
  logger?: Logger,
}): HttpFetch {
  const logger = options?.logger;
  if (logger !== undefined) {
    // Implementation that logs every request.
    return (...args) => {
      logger.trace("fetch", ...args);
      return fetch(...args);
    };
  }
  // Default.
  return (...args) => {
    return fetch(...args);
  };
}

/**
 * Custom re-export to keep this part of code dataspecer neutral.
 */
export type HttpFetch = FetchApi;
