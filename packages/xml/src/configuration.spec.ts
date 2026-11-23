import { describe, expect, it } from "vitest";
import { DefaultXmlConfiguration, resolveXmlConfig, xmlConfig } from "./configuration.ts";

describe("XML configuration", () => {
  it("skips undefined fields, preserves null, and ignores unknown options", () => {
    const input = { generateSawsdl: undefined, commonXmlSchemaExternalLocation: null, unknown: true };
    expect(resolveXmlConfig([
      xmlConfig({ generateSawsdl: false, commonXmlSchemaExternalLocation: "https://example.org/schema.xsd" }),
      xmlConfig(input),
    ])).toEqual({ ...DefaultXmlConfiguration, generateSawsdl: false, commonXmlSchemaExternalLocation: null });
    expect(input).toEqual({ generateSawsdl: undefined, commonXmlSchemaExternalLocation: null, unknown: true });
  });
});
