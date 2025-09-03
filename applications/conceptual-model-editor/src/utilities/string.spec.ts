import { describe, expect, test } from "vitest";

import { languageStringToStringNext } from "./string";

describe("languageStringToString", () => {

  test("Select preferred from a language string.", () => {
    const actual = languageStringToStringNext(["cs"], { "cs": "text" });
    expect(actual).toBe("text");
  });

  test("Select using preference from a language string.", () => {
    const actual = languageStringToStringNext(["cs", "en"], { "en": "text" });
    expect(actual).toBe("text [en]");
  });

  test("Select anything from a language string.", () => {
    const actual = languageStringToStringNext(["en", "de"], { "cs": "text" });
    expect(actual).toBe("text [cs]");
  });

  test("Select from an empty language string.", () => {
    const actual = languageStringToStringNext(["en", "de"], {});
    expect(actual).toBe("");
  });

  test("Select from a language string should not add empty language.", () => {
    const actual = languageStringToStringNext(["en"], { "": "text" });
    expect(actual).toBe("text");
  });

});
