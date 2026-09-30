import { describe, test, expect } from "vitest";
import {
  createSelectControlledVocabulariesPresenter,
} from "./select-controlled-vocabularies-presenter";
import type { SelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
import { createSelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
import type { ControlledVocabularyUsage } from "./controlled-vocabulary-model";
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

function findItem(state: SelectControlledVocabulariesState, vocabularyId: string) {
  return state.items.find(item => item.vocabulary.id === vocabularyId);
}

function itemId(state: SelectControlledVocabulariesState, vocabularyId: string) {
  const item = findItem(state, vocabularyId);
  if (item === undefined) {
    throw new Error(`No item for vocabulary '${vocabularyId}' in state.`);
  }
  return item.id;
}

describe("createSelectControlledVocabulariesPresenter", () => {

  test("onOpenAddForm opens the add form.", () => {
    let state = createSelectControlledVocabulariesState([], [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    expect(state.addForm).toBeNull();
    presenter.onOpenAddForm();
    expect(state.addForm).not.toBeNull();
    expect(state.addForm?.availableVocabularies).toEqual([EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
  });

  test("onOpenAddForm excludes vocabularies already used by an inherited or added item.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "must" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    expect(state.addForm?.availableVocabularies).toEqual([GEOGRAPHY_VOCABULARY]);
  });

  test("onCancelAddForm closes the add form.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "must" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    expect(state.addForm).not.toBeNull();

    presenter.onCancelAddForm();
    expect(state.addForm).toBeNull();
  });

  test("onConfirmAddForm adds a new vocabulary and closes the form.", () => {
    let state = createSelectControlledVocabulariesState([], [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    presenter.addFormPresenter.vocabularyPicker.onChange("education");
    presenter.addFormPresenter.onQualifierChange("recommended");
    expect(state.items).toHaveLength(0);

    presenter.onConfirmAddForm();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].vocabulary.id).toBe("education");
    expect(state.items[0].qualifier).toBe("recommended");
    expect(state.addForm).toBeNull();
  });

  test("onConfirmAddForm is a no-op when no vocabulary is selected.", () => {
    let state = createSelectControlledVocabulariesState([], [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    expect(state.items).toHaveLength(0);

    presenter.onConfirmAddForm();
    expect(state.items).toHaveLength(0);
    expect(state.addForm).not.toBeNull();
  });

  test("onRemove removes a directly added vocabulary.", () => {
    const added: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "may" },
      { assignmentId: "cv-geography", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "recommended" },
    ];
    let state = createSelectControlledVocabulariesState([], [], added, [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    expect(state.items).toHaveLength(2);
    presenter.onRemove(itemId(state, "education"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].vocabulary.id).toBe("geography");
  });

  test("onRemove is a no-op for an inherited vocabulary.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "must" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onRemove(itemId(state, "education"));

    expect(state.items).toHaveLength(1);
    expect(state.items[0].vocabulary.id).toBe("education");
  });

  test("itemPresenter modifies the qualifier of a directly added item.", () => {
    const added: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "may" },
    ];
    let state = createSelectControlledVocabulariesState([], [], added, [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.getItemPresenter(itemId(state, "education")).onQualifierChange("must");

    expect(findItem(state, "education")?.qualifier).toBe("must");
  });

  test("itemPresenter only ever touches the targeted vocabulary.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "may" },
    ];
    const added: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-geography", vocabulary: GEOGRAPHY_VOCABULARY, qualifier: "recommended" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], added, [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.getItemPresenter(itemId(state, "geography")).onQualifierChange("must");

    expect(findItem(state, "geography")?.qualifier).toBe("must");
    expect(findItem(state, "education")?.qualifier).toBe("may");
  });

  test("itemPresenter enables override and seeds the qualifier from the inherited value.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "must" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    expect(findItem(state, "education")?.inherited?.overrideEnabled).toBe(false);

    presenter.getItemPresenter(itemId(state, "education")).onOverrideToggle();

    expect(findItem(state, "education")?.inherited?.overrideEnabled).toBe(true);
    expect(findItem(state, "education")?.qualifier).toBe("must");
  });

  test("itemPresenter changes an override qualifier once enabled.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-education", vocabulary: EDUCATION_VOCABULARY, qualifier: "must" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [EDUCATION_VOCABULARY, GEOGRAPHY_VOCABULARY]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.getItemPresenter(itemId(state, "education")).onOverrideToggle();
    presenter.getItemPresenter(itemId(state, "education")).onQualifierChange("recommended");

    expect(findItem(state, "education")?.qualifier).toBe("recommended");
    expect(findItem(state, "education")?.inherited?.qualifier).toBe("must");
  });

});
