import { describe, test } from "vitest";

import { semanticModelToLightweightOwl } from "./lightweight-owl-factory.ts";
import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { OwlOntology } from "./lightweight-owl-model.ts";

describe("semanticModelToLightweightOwl", () => {

  /**
   * Test resolution of relative IRI with respect to base IRI.
   * The absolute IRI should remain unchanged.
   */
  test("Relative and absolute IRI.", () => {

    const builder = createDefaultSemanticModelBuilder({
      baseIdentifier: "",
      baseIri: "http://example.com/base#",
    });

    builder.class({ iri: "relative" });

    builder.class({ iri: "http://example.com/base#absolute" });

    const actual = semanticModelToLightweightOwl(
      [], [builder.build()], {
      baseIri: "http://example.com/owl#",
      idDefinedBy: "http://example.com/definition"
    });

    const expected: OwlOntology = {
      classes: [{
        "iri": "http://example.com/base#relative",
        "name": {},
        "description": {},
        "subClassOf": [],
        "isDefinedBy": "http://example.com/definition"
      }, {
        "iri": "http://example.com/base#absolute",
        "name": {},
        "description": {},
        "subClassOf": [],
        "isDefinedBy": "http://example.com/definition"
      }],
      properties: []
    };

    expect(actual).toStrictEqual(expected);
  });

});
