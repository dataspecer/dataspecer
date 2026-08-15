import { describe, test, expect } from "vitest";
import {
  createSelectControlledVocabulariesState,
  hasControlledVocabularyConflict,
} from "./select-controlled-vocabularies-state";
import type { SelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
import type { ControlledVocabularyUsage } from "./controlled-vocabulary-model";

const V1 = {
  id: "v1",
  name: "Vocabulary 1",
  iri: "http://example.com/v1",
  regex: "^.*$",
  downloadUrl: "http://example.com/v1/download",
  docsUrl: "http://example.com/v1/docs",
};

const V2 = {
  id: "v2",
  name: "Vocabulary 2",
  iri: "http://example.com/v2",
  regex: "^.*$",
  downloadUrl: "http://example.com/v2/download",
  docsUrl: "http://example.com/v2/docs",
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
        { id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("Conflict when two vocabularies with one MUST.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });

  test("No conflict when multiple vocabularies with no MUST.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", vocabulary: V1, qualifier: "RECOMMENDED", inherited: null },
        { id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(false);
  });

  test("Conflict when two MUST vocabularies.", () => {
    const state: SelectControlledVocabulariesState = {
      items: [
        { id: "1", vocabulary: V1, qualifier: "MUST", inherited: null },
        { id: "2", vocabulary: V2, qualifier: "MUST", inherited: null },
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
          id: "1",
          vocabulary: V1,
          qualifier: "MUST",
          inherited: { qualifier: "RECOMMENDED", overrideEnabled: true },
        },
        { id: "2", vocabulary: V2, qualifier: "MAY", inherited: null },
      ],
      availableVocabularies: [V1, V2],
      addForm: null,
    };
    expect(hasControlledVocabularyConflict(state)).toBe(true);
  });


});
