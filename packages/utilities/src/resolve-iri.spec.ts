import { describe, test, expect } from "vitest";

import {
  createNullAwareIriResolver,
  createIriResolver,
  isAbsoluteIri,
} from "./resolve-iri.ts";

describe("createNullAwareIriResolver", () => {

  test("Resolve absolute with base null.", () => {
    const resolver = createNullAwareIriResolver(null);
    expect(resolver("http://localhost")).toBe("http://localhost");
  });

  test("Resolve null.", () => {
    const resolver = createNullAwareIriResolver("http://base/");
    expect(resolver(null)).toBe(null);
  });

});

describe("createIriResolver", () => {

  test("Resolve absolute.", () => {
    const resolver = createIriResolver("http://base/");
    expect(resolver("http://localhost")).toBe("http://localhost");
  });

  test("Resolve relative.", () => {
    const resolver = createIriResolver("http://base/");
    expect(resolver("relative")).toBe("http://base/relative");
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
