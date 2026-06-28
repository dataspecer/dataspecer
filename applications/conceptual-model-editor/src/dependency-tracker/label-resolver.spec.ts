import { it, describe, expect } from "vitest";

import { createLabelResolver } from "./label-resolver";

describe("createLabelResolver", () => {

  it("Identifier only.", () => {
    const resolver = createLabelResolver({}, ["en"]);
    const actual = resolver.resolveLabel({
      identifier: "000",
      iri: null,
      label: {},
    });
    expect(actual).toBe("000");
  });

  it("IRI.", () => {
    const resolver = createLabelResolver({}, ["en"]);
    const actual = resolver.resolveLabel({
      identifier: "000",
      iri: "http://localhost/entity",
      label: {},
    });
    expect(actual).toBe("http://localhost/entity");
  });

  it("IRI with a prefix.", () => {
    const resolver = createLabelResolver({
      "http://example.com/": "ex",
    }, ["en"]);
    const actual = resolver.resolveLabel({
      identifier: "000",
      iri: "http://example.com/entity",
      label: {},
    });
    expect(actual).toBe("ex:entity");
  });

  it("Label in requested language.", () => {
    const resolver = createLabelResolver({}, ["en"]);
    const actual = resolver.resolveLabel({
      identifier: "000",
      iri: null,
      label: {en: "Resource"},
    });
    expect(actual).toBe("Resource");
  });

  /**
   * When using non-primary language we add an information about the language.
   */
  it("Label in a second language.", () => {
    const resolver = createLabelResolver({}, ["en", "cs"]);
    const actual = resolver.resolveLabel({
      identifier: "000",
      iri: null,
      label: {cs: "Zdroj", "": ""},
    });
    expect(actual).toBe("Zdroj [cs]");
  });

  /**
   * We use label with empty language string preferably to other language.
   */
  it("Label with language.", () => {
    const resolver = createLabelResolver({}, ["en"]);
    const actual = resolver.resolveLabel({
      identifier: "000",
      iri: null,
      label: {"": "Resource", cs: "Zdroj"},
    });
    expect(actual).toBe("Resource");
  });

});
