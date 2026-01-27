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

describe("applyNoClassConstraint", () => {

  test("Default.", () => {

    const input: ShaclModel = {
      iri: "http://localhost/does-not-matter",
      members: [{
        iri: "http://localhost/does-not-matter",
        closed: false,
        seeAlso: "http://localhost/does-not-matter",
        targetClass: "http://example.com/vocabulary#object",
        propertyShapes: [],
      }]
    };

    //

    const actual = applyNoClassConstraint(input);

    expect(actual.members[0].targetClass).toBe(null);

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

});
