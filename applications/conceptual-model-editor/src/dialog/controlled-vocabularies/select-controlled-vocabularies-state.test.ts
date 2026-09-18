import { describe, test, expect } from "vitest";
import {
  createSelectControlledVocabulariesState,
  findDuplicateVocabularyItemKeys,
  hasControlledVocabularyConflict,
} from "./select-controlled-vocabularies-state";
import type { SelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
import type { ControlledVocabularyUsage } from "./controlled-vocabulary-model";
import { DEFAULT_CONTROLLED_VOCABULARY } from "@dataspecer/controlled-vocabulary-model";

const V1 = {
  ...DEFAULT_CONTROLLED_VOCABULARY,
  id: "v1",
  title: "Vocabulary 1",
  references: "http://example.com/v1",
};

const V2 = {
  ...DEFAULT_CONTROLLED_VOCABULARY,
  id: "v2",
  title: "Vocabulary 2",
  references: "http://example.com/v2",
};

describe("hasControlledVocabularyConflict", () => {

  test("No conflict when zero vocabularies.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("No conflict when one MUST vocabulary alone.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("Conflict when two vocabularies with one MUST.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { key: "2", id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });

  test("No conflict when multiple vocabularies with no MUST.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "RECOMMENDED", inherited: null },
        { key: "2", id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("Conflict when two MUST vocabularies.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { key: "2", id: "2", vocabulary: V2, qualifier: "MUST", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });

  test("Conflict considers overridden inherited qualifiers.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        {
          key: "1",
          id: "own-1",
          vocabulary: V1,
          qualifier: "MUST",
          inherited: { assignmentId: "cv-1", qualifier: "RECOMMENDED", overrideEnabled: true },
        },
        { key: "2", id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });


});

describe("findDuplicateVocabularyItemKeys", () => {

  test("No duplicates when vocabularies differ.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { key: "2", id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(findDuplicateVocabularyItemKeys(state)).toStrictEqual(new Set());
  });

  test("Same vocabulary with the same qualifier is a duplicate.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { key: "2", id: "2", vocabulary: V1, qualifier: "MUST", inherited: null },
      ],
      availableVocabularies: [V1],
      addForm: null,
    };
    expect(findDuplicateVocabularyItemKeys(state)).toStrictEqual(new Set(["1", "2"]));
  });

  test("Same vocabulary with a different qualifier is also a duplicate.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { key: "1", id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { key: "2", id: "2", vocabulary: V1, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1],
      addForm: null,
    };
    expect(findDuplicateVocabularyItemKeys(state)).toStrictEqual(new Set(["1", "2"]));
  });

});
