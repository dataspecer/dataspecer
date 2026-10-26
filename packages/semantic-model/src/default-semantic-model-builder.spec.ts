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

  test("Forwards description, nameProperty, and descriptionProperty onto the property's range end.", () => {
    const builder = createDefaultSemanticModelBuilder({
      baseIdentifier: "",
      baseIri: "http://example.com/base#",
    });
    const owner = builder.class({ id: "000", iri: "owner" });
    const range = builder.class({ id: "001", iri: "range" });
    const property = owner.property({
      iri: "property",
      name: { en: "Name" },
      description: { en: "Description" },
      nameProperty: "http://example.com/nameProperty",
      descriptionProperty: "http://example.com/descriptionProperty",
      range,
    });
    const actual = builder.build();

    //

    const entity = actual.getEntities()[property.identifier] as any;
    const [_, rangeEnd] = entity.ends;
    expect(rangeEnd.name).toStrictEqual({ en: "Name" });
    expect(rangeEnd.description).toStrictEqual({ en: "Description" });
    expect(rangeEnd.nameProperty).toBe("http://example.com/nameProperty");
    expect(rangeEnd.descriptionProperty).toBe("http://example.com/descriptionProperty");
  });

});
