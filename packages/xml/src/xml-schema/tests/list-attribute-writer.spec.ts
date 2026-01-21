import { describe, it, expect } from "vitest";
import { 
  XmlSchemaAttribute, 
  XmlSchemaSimpleType
} from "../xml-schema-model";
import { XmlStreamWriter } from "../../xml/xml-writer";

function getWriter(): [string[], XmlStreamWriter] {
  const buffer = [];

  return [buffer, new XmlStreamWriter({
    write: async function(text: string) {
      buffer.push(text);
    },
    close: async function() { }
  })];
}

describe("XSD List Attribute Writer", () => {
  it("should write attribute with inline xs:list type correctly", async () => {
    const [buffer, writer] = getWriter();
    
    // Register XS namespace
    writer.registerNamespace("xs", "http://www.w3.org/2001/XMLSchema");
    
    // Create an attribute with inline list type
    const attribute: XmlSchemaAttribute = {
      name: [null, "title"],
      isRequired: true,
      annotation: null,
      type: {
        entityType: "type",
        name: null,
        annotation: null,
        simpleDefinition: {
          xsType: "list",
          itemType: ["xs", "string"],
          contents: [],
        },
      } as XmlSchemaSimpleType,
    };

    // Write the attribute using our writer logic
    await writer.writeElementFull("xs", "attribute")(async (writer) => {
      if (attribute.isRequired) {
        await writer.writeLocalAttributeValue("use", "required");
      }
      await writer.writeLocalAttributeValue("name", attribute.name[1]);
      
      const type = attribute.type as XmlSchemaSimpleType;
      // Inline simple type
      await writer.writeElementFull("xs", "simpleType")(async (writer) => {
        const definition = type.simpleDefinition;
        await writer.writeElementFull("xs", definition.xsType)(async (writer) => {
          await writer.writeLocalAttributeValue(
            "itemType", 
            writer.getQName(...(definition as any).itemType)
          );
        });
      });
    });

    const output = buffer.join("");
    
    // Verify the output contains xs:list with itemType
    expect(output).toContain('<xs:attribute');
    expect(output).toContain('use="required"');
    expect(output).toContain('name="title"');
    expect(output).toContain('<xs:simpleType>');
    expect(output).toContain('<xs:list');
    expect(output).toContain('itemType="xs:string"');
    expect(output).toContain('</xs:simpleType>');
    expect(output).toContain('</xs:attribute>');
    
    // Verify structure: should not have type attribute on xs:attribute
    expect(output).not.toContain('type="xs:string"');
  });

  it("should write attribute with simple type reference (no list)", async () => {
    const [buffer, writer] = getWriter();
    
    // Register XS namespace
    writer.registerNamespace("xs", "http://www.w3.org/2001/XMLSchema");
    
    // Create an attribute with simple type reference (cardinality = 1)
    const attribute: XmlSchemaAttribute = {
      name: [null, "id"],
      isRequired: false,
      annotation: null,
      type: {
        entityType: "type",
        name: ["xs", "string"],
        annotation: null,
      },
    };

    // Write the attribute
    await writer.writeElementFull("xs", "attribute")(async (writer) => {
      if (attribute.isRequired) {
        await writer.writeLocalAttributeValue("use", "required");
      }
      await writer.writeLocalAttributeValue("name", attribute.name[1]);
      await writer.writeLocalAttributeValue(
        "type",
        writer.getQName(...attribute.type.name)
      );
    });

    const output = buffer.join("");
    
    // Verify the output is a simple attribute with type reference
    expect(output).toContain('<xs:attribute');
    expect(output).toContain('name="id"');
    expect(output).toContain('type="xs:string"');
    expect(output).not.toContain('<xs:simpleType>');
    expect(output).not.toContain('<xs:list');
    // The closing tag may be self-closing or explicit
    expect(output).toMatch(/\/>|<\/xs:attribute>/);
  });
});
