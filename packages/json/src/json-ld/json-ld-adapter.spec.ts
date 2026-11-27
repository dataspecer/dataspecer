import { describe, expect, it } from "vitest";
import { OFN, XSD } from "@dataspecer/core/well-known";
import { StructureModelPrimitiveType, StructureModelProperty } from "@dataspecer/generators/structure-model/model";
import { JsonLdAdapter } from "./json-ld-adapter.ts";

/**
 * Returns the "@type" that the context gives to an attribute of the data type.
 */
function contextTypeOfAttribute(dataType: string): string {
  const type = new StructureModelPrimitiveType();
  type.dataType = dataType;
  const property = new StructureModelProperty();
  property.technicalLabel = "value";
  property.cimIri = "https://example.org/value";
  property.dataTypes = [type];

  // The context of a single attribute needs neither the model nor the specification.
  const adapter = new JsonLdAdapter(null as any, null as any, { configurationChain: [] } as any, {} as any);
  const context: Record<string, any> = {};
  adapter["generatePropertyContext"](property, context, { xsd: "http://www.w3.org/2001/XMLSchema#" }, {});
  return context["value"]["@type"];
}

describe("JSON-LD context of attributes", () => {

  it("maps URI values to IRIs", () => {
    expect(contextTypeOfAttribute(OFN.url)).toBe("@id");
    expect(contextTypeOfAttribute(XSD.anyURI)).toBe("@id");
  });

  it("keeps the datatype of literal values", () => {
    expect(contextTypeOfAttribute(OFN.string)).toBe("xsd:string");
    expect(contextTypeOfAttribute(OFN.date)).toBe("xsd:date");
  });

});
