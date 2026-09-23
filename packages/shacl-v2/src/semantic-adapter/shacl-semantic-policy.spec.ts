import { describe, test, expect } from "vitest";

import { createSemicShaclStylePolicy } from "./shacl-semantic-policy.ts";

describe("createSemicShaclStylePolicy", () => {

  // Percent escape all but first '#'.
  test("https://github.com/dataspecer/dataspecer/issues/1282", () => {

    const policy = createSemicShaclStylePolicy("http://example.com/#", {});

    const actual = policy.shaclNodeShape(
      "this-string-is-not-used-in-the name",
      "https://example.com/#Kid")

    expect(actual).toBe("http://example.com/#https://example.com/%23KidShape");

  });

  describe("shaclControlledVocabularyShape", () => {

    test("Different vocabularies on the same class get distinct IRIs.", () => {

      const policy = createSemicShaclStylePolicy("http://example.com/", {});

      const first = policy.shaclControlledVocabularyShape(
        "http://example.com/profile#Person",
        "http://example.com/vocabulary#Person",
        "http://example.com/vocabularies/cv-1");
      const second = policy.shaclControlledVocabularyShape(
        "http://example.com/profile#Person",
        "http://example.com/vocabulary#Person",
        "http://example.com/vocabularies/cv-2");

      expect(first).not.toBe(second);

    });

    test("Same inputs are deterministic.", () => {

      const policy = createSemicShaclStylePolicy("http://example.com/", {});

      const first = policy.shaclControlledVocabularyShape(
        "http://example.com/profile#Person",
        "http://example.com/vocabulary#Person",
        "http://example.com/vocabularies/cv-1");
      const second = policy.shaclControlledVocabularyShape(
        "http://example.com/profile#Person",
        "http://example.com/vocabulary#Person",
        "http://example.com/vocabularies/cv-1");

      expect(first).toBe(second);

    });

  });

});
