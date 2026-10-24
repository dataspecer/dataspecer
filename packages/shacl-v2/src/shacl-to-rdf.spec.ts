import { describe, test, expect } from "vitest";
import {
  createShaclPropertyShape,
  ShaclModel,
  ShaclSeverity,
} from "./shacl-model.ts";
import { shaclToRdf } from "./shacl-to-rdf.ts";

function createModel(
  pattern: string | null,
  severity: ShaclSeverity | null,
  propertyShapes: ShaclModel["members"][number]["propertyShapes"],
): ShaclModel {
  return {
    iri: "http://example.com/model",
    members: [{
      iri: "http://example.com/shape",
      seeAlso: "http://example.com/profile",
      closed: false,
      targetClass: "http://example.com/vocabulary#concept",
      propertyShapes,
      pattern,
      severity,
    }],
  };
}

describe("shaclToRdf", () => {

  test("Writes pattern and severity of a node shape.", async () => {
    const rdf = await shaclToRdf(
      createModel("^http://example\\.com/codes/.*$", ShaclSeverity.Violation, []),
      {});
    expect(rdf).toContain("sh:pattern");
    expect(rdf).toContain("sh:severity sh:Violation");
  });

  test("Writes hasValue and severity of a property shape.", async () => {
    const rdf = await shaclToRdf(createModel(null, ShaclSeverity.Warning, [
      createShaclPropertyShape({
        iri: "http://example.com/shape/inScheme",
        path: "http://www.w3.org/2004/02/skos/core#inScheme",
        hasValue: "http://example.com/scheme",
        severity: ShaclSeverity.Warning,
      }),
    ]), {});
    expect(rdf).toContain("sh:path skos:inScheme");
    expect(rdf).toContain("sh:hasValue <http://example.com/scheme>");
    // Once on the node shape and once on the property shape.
    expect(rdf.match(/sh:severity sh:Warning/g)).toHaveLength(2);
  });

  test("Does not write hasValue, severity or pattern when not set.", async () => {
    const rdf = await shaclToRdf(createModel(null, null, [
      createShaclPropertyShape({
        iri: "http://example.com/shape/p",
        path: "http://example.com/vocabulary#p",
      }),
    ]), {});
    expect(rdf).not.toContain("sh:hasValue");
    expect(rdf).not.toContain("sh:severity");
    expect(rdf).not.toContain("sh:pattern");
  });

});
