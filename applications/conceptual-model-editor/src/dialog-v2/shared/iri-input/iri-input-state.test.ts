import { describe, test, expect } from "vitest";
import { createIriInputState, iriInputStateAsIri } from "./iri-input-state";

describe("createIriInputState", () => {

  test("Create relative", () => {
    expect(createIriInputState("http://example.com/", "http://localhost/name"))
      .toBe({
        base: "http://example.com/",
        value: "http://localhost/name",
        inputMode: "absolute",
      })
  });

  test("Create absolute", () => {
    expect(createIriInputState("http://example.com/", "http://example.com/name"))
      .toBe({
        base: "http://example.com/",
        value: "name",
        inputMode: "relative",
      })
  });

});

describe("iriInputStateAsIri", () => {

  test("From relative.", () => {
    const input = createIriInputState(
      "http://example.com/", "http://localhost/name");
    expect(iriInputStateAsIri(input)).toBe("http://localhost/name")
  });

  test("From absolute.", () => {
    const input = createIriInputState(
      "http://example.com/", "http://example.com/name");
    expect(iriInputStateAsIri(input)).toBe("http://example.com/name")
  });

});
