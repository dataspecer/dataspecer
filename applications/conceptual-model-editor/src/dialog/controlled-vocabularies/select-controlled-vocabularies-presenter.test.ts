import { describe, test, expect } from "vitest";
import {
  createSelectControlledVocabulariesPresenter,
} from "./select-controlled-vocabularies-presenter";
import type { SelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
import { createSelectControlledVocabulariesState } from "./select-controlled-vocabularies-state";
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

function findItem(state: SelectControlledVocabulariesState, vocabularyId: string) {
  return state.items.find(item => item.vocabulary.id === vocabularyId);
}

function itemKey(state: SelectControlledVocabulariesState, vocabularyId: string) {
  const item = findItem(state, vocabularyId);
  if (item === undefined) {
    throw new Error(`No item for vocabulary '${vocabularyId}' in state.`);
  }
  return item.key;
}

describe("createSelectControlledVocabulariesPresenter", () => {

  test("onOpenAddForm opens the add form.", () => {
    let state = createSelectControlledVocabulariesState([], [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    expect(state.addForm).toBeNull();
    presenter.onOpenAddForm();
    expect(state.addForm).not.toBeNull();
    expect(state.addForm?.availableVocabularies).toEqual([V1, V2]);
  });

  test("onOpenAddForm excludes vocabularies already used by an inherited or added item.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MUST" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    expect(state.addForm?.availableVocabularies).toEqual([V2]);
  });

  test("onCancelAddForm closes the add form.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MUST" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    expect(state.addForm).not.toBeNull();

    presenter.onCancelAddForm();
    expect(state.addForm).toBeNull();
  });

  test("onConfirmAddForm adds a new vocabulary and closes the form.", () => {
    let state = createSelectControlledVocabulariesState([], [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onOpenAddForm();
    presenter.addFormPresenter.vocabularyPicker.onChange("v1");
    presenter.addFormPresenter.onQualifierChange("RECOMMENDED");
    expect(state.items).toHaveLength(0);

    presenter.onConfirmAddForm();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].vocabulary.id).toBe("v1");
    expect(state.items[0].qualifier).toBe("RECOMMENDED");
    expect(state.addForm).toBeNull();
  });

  test("onConfirmAddForm is a no-op when no vocabulary is selected.", () => {
    let state = createSelectControlledVocabulariesState([], [], [], [V1, V2]);
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
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MAY" },
      { assignmentId: "cv-v2", vocabulary: V2, qualifier: "RECOMMENDED" },
    ];
    let state = createSelectControlledVocabulariesState([], [], added, [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    expect(state.items).toHaveLength(2);
    presenter.onRemove(itemKey(state, "v1"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].vocabulary.id).toBe("v2");
  });

  test("onRemove is a no-op for an inherited vocabulary.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MUST" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.onRemove(itemKey(state, "v1"));

    expect(state.items).toHaveLength(1);
    expect(state.items[0].vocabulary.id).toBe("v1");
  });

  test("itemPresenter modifies the qualifier of a directly added item.", () => {
    const added: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MAY" },
    ];
    let state = createSelectControlledVocabulariesState([], [], added, [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.getItemPresenter(itemKey(state, "v1")).onQualifierChange("MUST");

    expect(findItem(state, "v1")?.qualifier).toBe("MUST");
  });

  test("itemPresenter only ever touches the targeted vocabulary.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MAY" },
    ];
    const added: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v2", vocabulary: V2, qualifier: "RECOMMENDED" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], added, [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.getItemPresenter(itemKey(state, "v2")).onQualifierChange("MUST");

    expect(findItem(state, "v2")?.qualifier).toBe("MUST");
    expect(findItem(state, "v1")?.qualifier).toBe("MAY");
  });

  test("itemPresenter enables override and seeds the qualifier from the inherited value.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MUST" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    expect(findItem(state, "v1")?.inherited?.overrideEnabled).toBe(false);

    presenter.getItemPresenter(itemKey(state, "v1")).onOverrideToggle();

    expect(findItem(state, "v1")?.inherited?.overrideEnabled).toBe(true);
    expect(findItem(state, "v1")?.qualifier).toBe("MUST");
  });

  test("itemPresenter changes an override qualifier once enabled.", () => {
    const inherited: ControlledVocabularyUsage[] = [
      { assignmentId: "cv-v1", vocabulary: V1, qualifier: "MUST" },
    ];
    let state = createSelectControlledVocabulariesState(inherited, [], [], [V1, V2]);
    const presenter = createSelectControlledVocabulariesPresenter(
      next => { state = next(state); });

    presenter.getItemPresenter(itemKey(state, "v1")).onOverrideToggle();
    presenter.getItemPresenter(itemKey(state, "v1")).onQualifierChange("RECOMMENDED");

    expect(findItem(state, "v1")?.qualifier).toBe("RECOMMENDED");
    expect(findItem(state, "v1")?.inherited?.qualifier).toBe("MUST");
  });

});
