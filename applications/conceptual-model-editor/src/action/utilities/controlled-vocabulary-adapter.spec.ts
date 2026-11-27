import { describe, expect, test } from "vitest";

import type { VocabularyItemState } from "../../dialog/controlled-vocabularies";
import { dialogVocabulariesToOperation } from "./controlled-vocabulary-adapter";

describe("dialogVocabulariesToOperation", () => {

  test("A row with a missing vocabulary keeps the vocabulary identifier.", () => {
    const item: VocabularyItemState = {
      id: "item",
      entityId: "assignment",
      vocabulary: { state: "not_found", vocabularyId: "deleted" },
      qualifier: "may",
      inherited: null,
    };

    expect(dialogVocabulariesToOperation([item])).toEqual([{
      assignment: "assignment",
      vocabulary: "deleted",
      qualifier: "may",
      replaces: null,
    }]);
  });

});
