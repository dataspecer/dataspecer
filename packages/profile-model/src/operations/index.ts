import * as atomic from "./atomic/index.ts";
import * as complex from "./complex/index.ts";

/**
 * Export all operations using a single object.
 * Thus user does not have to include individual operations.
 */
export const SemanticProfileModelOperations = Object.freeze({
  ...atomic,
  ...complex,
});
