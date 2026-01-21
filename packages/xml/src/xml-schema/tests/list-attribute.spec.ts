import { describe, it, expect } from "vitest";
import { 
  XmlSchemaAttribute, 
  XmlSchemaSimpleType,
  XmlSchemaSimpleItemList,
  xmlSchemaSimpleTypeDefinitionIsList 
} from "../xml-schema-model.ts";

describe("XSD List Type for Multi-Cardinality Attributes", () => {
  it("should create a list type for multi-valued attributes", () => {
    // Create a list type as would be generated for an attribute with [..*] cardinality
    const listDefinition: XmlSchemaSimpleItemList = {
      xsType: "list",
      itemType: ["xs", "string"],
      contents: [],
    };
    
    const listType: XmlSchemaSimpleType = {
      entityType: "type",
      name: null,
      annotation: null,
      simpleDefinition: listDefinition,
    };

    // Verify the type is recognized as a list type
    expect(xmlSchemaSimpleTypeDefinitionIsList(listType.simpleDefinition)).toBe(true);
    expect(listType.simpleDefinition.xsType).toBe("list");
    expect(listDefinition.itemType).toEqual(["xs", "string"]);
  });

  it("should create attribute with inline list type", () => {
    // Create an attribute with inline list type
    const listDefinition: XmlSchemaSimpleItemList = {
      xsType: "list",
      itemType: ["xs", "string"],
      contents: [],
    };
    
    const attribute: XmlSchemaAttribute = {
      name: [null, "title"],
      isRequired: true,
      annotation: null,
      type: {
        entityType: "type",
        name: null,
        annotation: null,
        simpleDefinition: listDefinition,
      } as XmlSchemaSimpleType,
    };

    // Verify the structure
    expect(attribute.name).toEqual([null, "title"]);
    expect(attribute.isRequired).toBe(true);
    expect(attribute.type).toBeDefined();
    expect((attribute.type as XmlSchemaSimpleType).simpleDefinition.xsType).toBe("list");
  });
});
