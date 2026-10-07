import { describe, test, expect } from "vitest";
import {
  findDuplicateVocabularyItemIds,
  hasControlledVocabularyConflict,
} from "./select-controlled-vocabularies-state";
import type { SelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
import { DEFAULT_CONTROLLED_VOCABULARY } from "@dataspecer/controlled-vocabulary-model";

const EDUCATION_VOCABULARY = {
  ...DEFAULT_CONTROLLED_VOCABULARY,
  id: "education",
  title: "Education vocabulary",
  references: "http://example.com/education",
};

const GEOGRAPHY_VOCABULARY = {
  ...DEFAULT_CONTROLLED_VOCABULARY,
  id: "geography",
  title: "Geography vocabulary",
  references: "http://example.com/geography",
};

describe("hasControlledVocabularyConflict", () => {

  test("No conflict when zero vocabularies.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("No conflict when one MUST vocabulary alone.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("Conflict when two vocabularies with one MUST.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
        { id: "2", entityId: "2", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "may", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });

  test("No conflict when multiple vocabularies with no MUST.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "recommended", inherited: null },
        { id: "2", entityId: "2", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "may", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("Conflict when two MUST vocabularies.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
        { id: "2", entityId: "2", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "must", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });

  test("Conflict considers overridden inherited qualifiers.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        {
          id: "1",
          entityId: "own-1",
          vocabulary: EDUCATION_VOCABULARY,
          qualifier: "must",
          inherited: { assignmentId: "cv-1", qualifier: "recommended", overrideEnabled: true },
        },
        { id: "2", entityId: "2", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "may", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });


});

describe("findDuplicateVocabularyItemIds", () => {

  test("No duplicates when vocabularies differ.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
        { id: "2", entityId: "2", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "may", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY],
      addForm: null,
    };
    expect(findDuplicateVocabularyItemIds(state)).toStrictEqual(new Set());
  });

  test("Same vocabulary with the same qualifier is a duplicate.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
        { id: "2", entityId: "2", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY],
      addForm: null,
    };
    expect(findDuplicateVocabularyItemIds(state)).toStrictEqual(new Set(["1", "2"]));
  });

  test("Same vocabulary with a different qualifier is also a duplicate.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", entityId: "1", vocabulary: EDUCATION_VOCABULARY, qualifier: "must", inherited: null },
        { id: "2", entityId: "2", vocabulary: EDUCATION_VOCABULARY, qualifier: "may", inherited: null },
      ],
      availableVocabularies: [EDUCATION_VOCABULARY],
      addForm: null,
    };
    expect(findDuplicateVocabularyItemIds(state)).toStrictEqual(new Set(["1", "2"]));
  });

});
