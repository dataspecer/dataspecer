import { describe, test, expect } from "vitest";
import { VocabularyItemState } from "./vocabulary-item-state";
import { createVocabularyItemPresenter } from "./vocabulary-item-presenter";
import { ControlledVocabulary } from "./controlled-vocabulary-model";

const VOCABULARY: ControlledVocabulary = {
  id: "v1",
  name: "Vocabulary",
  iri: "http://example.com/v1",
  regex: "^.*$",
  downloadUrl: "http://example.com/v1/download",
  docsUrl: "http://example.com/v1/docs",
};

describe("test createVocabularyItemPresenter", () => {

  test("After enabling override the inherited qualifier value is used", () => {
    let state: VocabularyItemState = {
      vocabulary: VOCABULARY,
      qualifier: "MUST",
      inherited: { qualifier: "MUST", overrideEnabled: false },
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onOverrideToggle();

    expect(state.inherited?.overrideEnabled).toBe(true);
    expect(state.qualifier).toBe("MUST");
  });

  test("Disabling override reverts qualifier to the inherited value.", () => {
    let state: VocabularyItemState = {
      vocabulary: VOCABULARY,
      qualifier: "RECOMMENDED",
      inherited: { qualifier: "MUST", overrideEnabled: true },
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onOverrideToggle();

    expect(state.inherited?.overrideEnabled).toBe(false);
    expect(state.qualifier).toBe("MUST");
  });

  test("Is a no-op for items that are not inherited.", () => {
    const initial: VocabularyItemState = {
      vocabulary: VOCABULARY,
      qualifier: "MAY",
      inherited: null,
    };
    let state = initial;
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onOverrideToggle();

    expect(state).toBe(initial);
  });

  test("Changes the qualifier of an overridden inherited item.", () => {
    let state: VocabularyItemState = {
      vocabulary: VOCABULARY,
      qualifier: "MUST",
      inherited: { qualifier: "MUST", overrideEnabled: true },
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onQualifierChange("RECOMMENDED");

    expect(state.qualifier).toBe("RECOMMENDED");
    expect(state.inherited?.qualifier).toBe("MUST");
  });

  test("Changes the qualifier of an added item.", () => {
    let state: VocabularyItemState = {
      vocabulary: VOCABULARY,
      qualifier: "AT_LEAST_1",
      inherited: null,
    };
    const presenter = createVocabularyItemPresenter(next => { state = next(state); });

    presenter.onQualifierChange("MAY");

    expect(state.qualifier).toBe("MAY");
  });

});
