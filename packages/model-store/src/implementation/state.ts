import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import type { StateResult } from "./interface.ts";

/**
 * Creates result for models that have no fake entities, i.e. their output state
 * is the core state.
 */
export function createStateResult(previousOutputState: EntityRecord, coreState: EntityRecord): StateResult {
  return {
    coreState,
    outputState: coreState,
    diff: diffEntities(previousOutputState, coreState),
  };
}
