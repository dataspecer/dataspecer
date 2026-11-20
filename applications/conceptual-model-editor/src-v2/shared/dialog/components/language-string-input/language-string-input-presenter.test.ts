import { describe, test, expect } from "vitest";
import { createLanguageStringInputPresenter } from "./language-string-input-presenter";
import { LanguageStringInputState } from "./language-string-input-state";

describe("createLanguageStringInputPresenter", () => {

  test("Add languages.", () => {

    let state: LanguageStringInputState = {
      active: null,
      defaultLanguage: "",
      values: []
    };

    const presenter = createLanguageStringInputPresenter(
      next => { state = next(state) });

    presenter.onAddLanguage("cs");
    expect(state.values).toStrictEqual([{ language: "cs", value: "" }]);

    // There should be no change with second addition.
    presenter.onAddLanguage("cs");
    expect(state.values).toStrictEqual([{ language: "cs", value: "" }]);

    // This should also update the active index.
    presenter.onAddLanguage("en");
    expect(state.active).toBe(1);
    expect(state.values.length).toBe(2);
    expect(state.values[1]).toStrictEqual({ language: "en", value: "" });
  });

  test("Remove languages.", () => {

    let state: LanguageStringInputState = {
      active: 1,
      defaultLanguage: "",
      values: [{ language: "cs", value: "" }, { language: "en", value: "" }],
    };

    const presenter = createLanguageStringInputPresenter(
      next => { state = next(state) });

    presenter.onRemoveLanguage("en");
    expect(state.active).toBe(0);
    expect(state.values.length).toBe(1);

    presenter.onRemoveLanguage("cs");
    expect(state.active).toBeNull();
    expect(state.values.length).toBe(0);
  });

  test("Use default language on write", () => {

    let state: LanguageStringInputState = {
      active: null,
      defaultLanguage: "cs",
      values: [],
    };

    const presenter = createLanguageStringInputPresenter(
      next => { state = next(state) });

    // This should add a new item.
    presenter.onChange("v");
    expect(state.active).toBe(0);
    expect(state.values.length).toBe(1);
    expect(state.values[0]).toStrictEqual({ language: "cs", value: "v" });
  });

});
