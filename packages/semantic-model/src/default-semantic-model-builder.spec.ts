import { describe, test, expect } from "vitest";

import { createDefaultSemanticModelBuilder } from "./default-semantic-model-builder.ts";

describe("DefaultSemanticModelBuilder", () => {

  test("Do not resolve with base URL.", () => {
    const baseUrl = "http://example.com/base#";
    const builder = createDefaultSemanticModelBuilder({
      baseIdentifier: "",
      baseIri: baseUrl,
    });
    builder.class({ id: "000", iri: "relative" });
    const iri = "http://example.com/absolute";
    builder.class({ id: "001", iri });
    const actual = builder.build();

    //

    expect(actual.getBaseIri()).toBe(baseUrl);
    const entities = actual.getEntities();
    expect((entities["000"] as any).iri).toBe("relative");
    expect((entities["001"] as any).iri).toBe(iri);
  });

  test("Resolve with base URL.", () => {
    const baseUrl = "http://example.com/base#";
    const builder = createDefaultSemanticModelBuilder({
      baseIdentifier: "",
      baseIri: baseUrl,
      resolveUrl: true,
    });
    builder.class({ id: "000", iri: "relative" });
    const iri = "http://example.com/absolute";
    builder.class({ id: "001", iri });
    const actual = builder.build();

    //

    expect(actual.getBaseIri()).toBe(baseUrl);
    const entities = actual.getEntities();
    expect((entities["000"] as any).iri).toBe("http://example.com/base#relative");
    expect((entities["001"] as any).iri).toBe(iri);
  });

});
