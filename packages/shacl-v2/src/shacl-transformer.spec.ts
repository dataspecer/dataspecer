import { describe, test, expect } from "vitest";
import {
  applyNoClassConstraint,
  filterLanguageStrings,
  splitConstraints,
} from "./shacl-transformer.ts";
import {
  createShaclPropertyShape,
  ShaclModel,
  ShaclNodeKind,
} from "./shacl-model.ts";
import { shaclToRdf } from "./shacl-to-rdf.ts";

describe("applyNoClassConstraint", () => {

  test("Default.", () => {

    const input: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://example.com/vocabulary#object",
        propertyShapes: [{
          iri: "",
          seeAlso: null,
          description: null,
          name: null,
          nodeKind: null,
          path: "",
          minCount: null,
          maxCount: null,
          datatype: null,
          class: "http://to-be-removed",
        }],
      }]
    };

    //

    const actual = applyNoClassConstraint(input);

    expect(actual.members[0].propertyShapes[0].class).toBe(null);

  });

});

describe("filterLanguageStrings", () => {

  test("Default.", () => {

    const input: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://localhost/does-not-matter",
        propertyShapes: [createShaclPropertyShape({
          iri: "http://localhost/does-not-matter",
          path: "http://spdx.org/rdf/terms#checksum",
          name: { cs: "Jméno", en: "Name", de: "Name" },
        })],
      }]
    };

    //

    const actual = filterLanguageStrings(input, ["en", "cs"]);

    expect(actual.members[0].propertyShapes[0].name).toStrictEqual({
      cs: "Jméno", en: "Name",
    });

  });

});

describe("splitConstraints", () => {

  test("Default.", () => {

    const input: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://www.w3.org/ns/dcat#Dataset",
        propertyShapes: [{
          iri: "http://example/shape",
          seeAlso: null,
          description: { en: "Description.." },
          name: { en: "checksum" },
          nodeKind: ShaclNodeKind.BlankNodeOrIRI,
          path: "http://spdx.org/rdf/terms#checksum",
          minCount: 1,
          maxCount: 2,
          datatype: "http://www.w3.org/2001/XMLSchema#hexBinary",
          class: "http://spdx.org/rdf/terms#Checksum",
        }],
      }]
    };

    // Actual

    const actual = splitConstraints(input);

    // Expected

    const expected: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://www.w3.org/ns/dcat#Dataset",
        propertyShapes: [createShaclPropertyShape({
          iri: "http://example/shape/nodeKind",
          description: { en: "Description.." },
          name: { en: "checksum" },
          nodeKind: ShaclNodeKind.BlankNodeOrIRI,
          path: "http://spdx.org/rdf/terms#checksum",
        }), createShaclPropertyShape({
          iri: "http://example/shape/minCount",
          description: { en: "Description.." },
          name: { en: "checksum" },
          path: "http://spdx.org/rdf/terms#checksum",
          minCount: 1,
        }), createShaclPropertyShape({
          iri: "http://example/shape/maxCount",
          description: { en: "Description.." },
          name: { en: "checksum" },
          path: "http://spdx.org/rdf/terms#checksum",
          maxCount: 2,
        }), createShaclPropertyShape({
          iri: "http://example/shape/datatype",
          description: { en: "Description.." },
          name: { en: "checksum" },
          path: "http://spdx.org/rdf/terms#checksum",
          datatype: "http://www.w3.org/2001/XMLSchema#hexBinary",
        }), createShaclPropertyShape({
          iri: "http://example/shape/class",
          description: { en: "Description.." },
          name: { en: "checksum" },
          path: "http://spdx.org/rdf/terms#checksum",
          class: "http://spdx.org/rdf/terms#Checksum",
        })],
      }]
    };

    //

    expect(actual).toStrictEqual(expected);

  });

  /**
   * This is related to https://github.com/dataspecer/dataspecer/issues/1297.
   * Where we do not render min-count == 0 as it is a default.
   * Combined with spit this cause the issue.
   * A solution is to not split if the min-count == 0;
   */
  test("https://github.com/dataspecer/dataspecer/issues/1458", async () => {

    const input: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://www.w3.org/ns/dcat#Dataset",
        propertyShapes: [{
          iri: "http://example/shape",
          seeAlso: null,
          description: { en: "Description.." },
          name: { en: "checksum" },
          nodeKind: null,
          path: "http://spdx.org/rdf/terms#checksum",
          minCount: 0,
          maxCount: null,
          datatype: null,
          class: null,
        }],
      }]
    };

    // Actual

    const actual = splitConstraints(input);

    // Expected

    const expected: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://www.w3.org/ns/dcat#Dataset",
        propertyShapes: [],
      }]
    };

    //

    expect(actual).toStrictEqual(expected);

  });

});
