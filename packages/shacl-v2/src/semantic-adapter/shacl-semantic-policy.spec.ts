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

});
