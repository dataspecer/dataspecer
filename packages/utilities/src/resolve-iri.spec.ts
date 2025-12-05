import { describe, test, expect } from "vitest";

import { createIriResolver, isAbsoluteIri } from "./resolve-iri.ts";

describe("createIriResolver", () => {

  test("Resolve absolute.", () => {
    expect(createIriResolver("http://base/")("http://localhost"))
      .toBe("http://localhost");
  });

  test("Resolve relative.", () => {
    expect(createIriResolver("http://base/")("relative"))
      .toBe("http://base/relative");
  });

});

describe("isAbsoluteIri", () => {

  test("Test absolute.", () => {
    expect(isAbsoluteIri("http://localhost/")).toBeTruthy();
  });

  test("Test relative.", () => {
    expect(isAbsoluteIri("#relative")).toBeFalsy();
  });

});