import { describe, test, expect } from "vitest";
import { VocabularyItemState } from "./vocabulary-item-state";
import { createVocabularyItemPresenter } from "./vocabulary-item-presenter";
import { ControlledVocabulary } from "./controlled-vocabulary-model";
import { DEFAULT_CONTROLLED_VOCABULARY } from "@dataspecer/controlled-vocabulary-model";

const VOCABULARY: ControlledVocabulary = {
  ...DEFAULT_CONTROLLED_VOCABULARY,
  id: "v1",
  title: { en: "Vocabulary" },
  references: "http://example.com/v1",
};

describe("test createVocabularyItemPresenter", () => {

  test("After enabling override the inherited qualifier value is used", () => {
    let state: VocabularyItemState = {
      id: "1",
      entityId: null,
      vocabulary: VOCABULARY,
      qualifier: "must",
      inherited: { assignmentId: "cv-1", qualifier: "must", overrideEnabled: false },
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onOverrideToggle();

    expect(state.inherited?.overrideEnabled).toBe(true);
    expect(state.qualifier).toBe("must");
  });

  test("Disabling override reverts qualifier to the inherited value.", () => {
    let state: VocabularyItemState = {
      id: "1",
      entityId: "own-1",
      vocabulary: VOCABULARY,
      qualifier: "recommended",
      inherited: { assignmentId: "cv-1", qualifier: "must", overrideEnabled: true },
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onOverrideToggle();

    expect(state.inherited?.overrideEnabled).toBe(false);
    expect(state.qualifier).toBe("must");
  });

  test("Is a no-op for items that are not inherited.", () => {
    const initial: VocabularyItemState = {
      id: "1",
      entityId: "own-1",
      vocabulary: VOCABULARY,
      qualifier: "may",
      inherited: null,
    };
    let state = initial;
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onOverrideToggle();

    expect(state).toBe(initial);
  });

  test("Changes the qualifier of an overridden inherited item.", () => {
    let state: VocabularyItemState = {
      id: "1",
      entityId: "own-1",
      vocabulary: VOCABULARY,
      qualifier: "must",
      inherited: { assignmentId: "cv-1", qualifier: "must", overrideEnabled: true },
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onQualifierChange("recommended");

    expect(state.qualifier).toBe("recommended");
    expect(state.inherited?.qualifier).toBe("must");
  });

  test("Changes the qualifier of an added item.", () => {
    let state: VocabularyItemState = {
      id: "1",
      entityId: "own-1",
      vocabulary: VOCABULARY,
      qualifier: "at-least-one",
      inherited: null,
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onQualifierChange("may");

    expect(state.qualifier).toBe("may");
  });

});
