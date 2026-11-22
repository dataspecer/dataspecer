import { describe, expect, test, vi } from "vitest";
import { applyControlledVocabularySelection } from "./apply-controlled-vocabulary-selection";
import type { VocabularyItemState } from "../dialog/controlled-vocabularies";
import type { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";

const CLASS_PROFILE = { identifier: "profile", model: "model" };

function createExecutor() {
  const executor = {
    createControlledVocabularyAssignment: vi.fn(),
    modifyControlledVocabularyAssignment: vi.fn(),
    removeControlledVocabularyAssignment: vi.fn(),
  };
  return {
    executor,
    cast: executor as unknown as CmeModelOperationExecutor,
  };
}

/**
 * An own assignment that refers to a vocabulary that does not exist anymore.
 */
function missingOwnItem(entityId: string, vocabularyId: string): VocabularyItemState {
  return {
    id: `item-${entityId}`,
    entityId,
    vocabulary: { state: "not_found", vocabularyId },
    qualifier: "may",
    inherited: null,
  };
}

describe("applyControlledVocabularySelection with a missing vocabulary", () => {

  test("Removing a row with a missing vocabulary removes the assignment.", () => {
    const { executor, cast } = createExecutor();
    const item = missingOwnItem("assignment", "deleted");
    applyControlledVocabularySelection(cast, CLASS_PROFILE, [item], []);
    expect(executor.removeControlledVocabularyAssignment).toHaveBeenCalledTimes(1);
    expect(executor.removeControlledVocabularyAssignment).toHaveBeenCalledWith(
      { identifier: "assignment", model: "model" });
  });

  test("Keeping a row with a missing vocabulary does not change the assignment.", () => {
    const { executor, cast } = createExecutor();
    const item = missingOwnItem("assignment", "deleted");
    applyControlledVocabularySelection(cast, CLASS_PROFILE, [item], [item]);
    expect(executor.removeControlledVocabularyAssignment).not.toHaveBeenCalled();
    expect(executor.modifyControlledVocabularyAssignment).not.toHaveBeenCalled();
    expect(executor.createControlledVocabularyAssignment).not.toHaveBeenCalled();
  });

  test("Changing the qualifier of a row with a missing vocabulary modifies the assignment.", () => {
    const { executor, cast } = createExecutor();
    const item = missingOwnItem("assignment", "deleted");
    applyControlledVocabularySelection(
      cast, CLASS_PROFILE, [item], [{ ...item, qualifier: "must" }]);
    expect(executor.modifyControlledVocabularyAssignment).toHaveBeenCalledWith(
      { identifier: "assignment", model: "model" }, { qualifier: "must" });
    expect(executor.removeControlledVocabularyAssignment).not.toHaveBeenCalled();
  });

});
