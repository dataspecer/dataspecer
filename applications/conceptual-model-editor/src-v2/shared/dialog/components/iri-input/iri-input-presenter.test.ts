import { describe, test, expect } from "vitest";
import { IriInputState } from "./iri-input-state";
import { createIriInputPresenter } from "./iri-input-presenter";

describe("createIriInputPresenter", () => {

  test("Change from absolute to relative and back.", () => {

        let state: IriInputState = {
          base: "http://example.com/",
          inputMode: "absolute",
          value: "http://example.com/name"
        };

        const presenter = createIriInputPresenter(
          next => { state = next(state) });

        presenter.setInputMode("relative");
        expect(state.value).toBe("name");

        presenter.setInputMode("absolute");
        expect(state.value).toBe("http://example.com/name");
  });

});
