import { describe, expect, it } from "vitest";
import { writeXmlSchema } from "./xml-schema-writer.ts";
import {
  XmlSchemaAttribute,
  type XmlSchema,
  type XmlSchemaAssertion,
  type XmlSchemaComplexType,
  type XmlSchemaSimpleType,
  type XmlSchemaType,
} from "./xml-schema-model.ts";

/**
 * Written XSD with the white space between the tags and the prefix xs of the tags removed.
 */
async function write(types: XmlSchemaType[], targetNamespace: string | null = null): Promise<string> {
  const schema = {
    targetNamespace,
    targetNamespacePrefix: null,
    defineLangString: false,
    imports: [],
    namespaces: [],
    types,
    elements: [],
  } as unknown as XmlSchema;

  const chunks: string[] = [];
  await writeXmlSchema(schema, { write: async (text: string) => { chunks.push(text); }, close: async () => {} });
  return chunks.join("").replace(/>\s+</g, "><").replace(/<(\/?)xs:/g, "<$1");
}

function restriction(name: string, base: string, pattern: string): XmlSchemaSimpleType {
  return {
    entityType: "type",
    name: [null, name],
    annotation: null,
    simpleDefinition: { xsType: "restriction", base: [null, base], pattern, contents: [] },
  } as unknown as XmlSchemaSimpleType;
}

function complexType(options: { assertions?: XmlSchemaAssertion[]; attributes?: XmlSchemaAttribute[]; definition?: object } = {}): XmlSchemaComplexType {
  return {
    entityType: "type",
    name: [null, "dataset"],
    annotation: null,
    mixed: false,
    abstract: false,
    complexDefinition: options.definition ?? { xsType: "sequence", contents: [] },
    attributes: options.attributes ?? [],
    assertions: options.assertions,
  } as unknown as XmlSchemaComplexType;
}

function assertion(test: string, xpathDefaultNamespace: "##targetNamespace" | null = null): XmlSchemaAssertion {
  return { test, xpathDefaultNamespace, controlledVocabularyId: null };
}

function attribute(name: string, type: XmlSchemaType): XmlSchemaAttribute {
  return Object.assign(new XmlSchemaAttribute(), { name: [null, name], type, annotation: null, isRequired: false });
}

describe("XSD of simple types", () => {
  it("defines a type that restricts the type before it", async () => {
    const xsd = await write([restriction("dataset-iri-1", "anyURI", "a.*"), restriction("dataset-iri", "dataset-iri-1", ".*b")]);

    expect(xsd).toContain('<simpleType name="dataset-iri-1"><restriction base="anyURI"><pattern value="a.*"/></restriction></simpleType>');
    expect(xsd).toContain('<simpleType name="dataset-iri"><restriction base="dataset-iri-1"><pattern value=".*b"/></restriction></simpleType>');
  });
});

describe("XSD of attributes", () => {
  it("writes a type defined inline as the simple type of the attribute", async () => {
    const inline = { ...restriction("", "anyURI", "a.*"), name: null } as unknown as XmlSchemaType;

    const xsd = await write([complexType({ attributes: [attribute("iri", inline)] })]);

    expect(xsd).toContain('<attribute name="iri"><simpleType><restriction base="anyURI"><pattern value="a.*"/></restriction></simpleType></attribute>');
    expect(xsd).not.toContain("not recognized");
  });

  it("refers to a named type by its name", async () => {
    const named = { entityType: "type", name: [null, "dataset-iri"], annotation: null } as XmlSchemaType;

    const xsd = await write([complexType({ attributes: [attribute("iri", named)] })]);

    expect(xsd).toContain('<attribute name="iri" type="dataset-iri"/>');
  });
});

describe("XSD of assertions on complex types", () => {
  it("writes each assertion after the content and the attributes of the type", async () => {
    const named = { entityType: "type", name: [null, "xs-string"], annotation: null } as XmlSchemaType;

    const xsd = await write([complexType({ attributes: [attribute("id", named)], assertions: [assertion("not(a)"), assertion("not(b)")] })]);

    expect(xsd).toContain('<attribute name="id" type="xs-string"/><assert test="not(a)"/><assert test="not(b)"/></complexType>');
  });

  it("writes no assertion for a type without them", async () => {
    expect(await write([complexType()])).not.toContain("<assert");
    expect(await write([complexType({ assertions: [] })])).not.toContain("<assert");
  });

  it("escapes the condition", async () => {
    const xsd = await write([complexType({ assertions: [assertion("count(p) < 3 and p/@a = '&'")] })]);

    // The writer escapes with numeric character references, which XML takes the same as &lt; and &amp;.
    expect(xsd).toContain('<assert test="count(p) &#60; 3 and p/@a = \'&#38;\'"/>');
  });

  it("writes the namespace of the names in the condition only when it is set", async () => {
    const xsd = await write(
      [complexType({ assertions: [assertion("not(p)", "##targetNamespace"), assertion("not(q)")] })],
      "http://example.com/ns",
    );

    expect(xsd).toContain('<assert test="not(p)" xpathDefaultNamespace="##targetNamespace"/>');
    expect(xsd).toContain('<assert test="not(q)"/>');
  });

  it("does not silently drop an assertion on a type that cannot have it", async () => {
    const withSimpleContent = complexType({
      assertions: [assertion("true()")],
      definition: { xsType: "simpleContent", base: [null, "anyURI"], attributes: [], contents: [] },
    });

    await expect(write([withSimpleContent])).rejects.toThrow("Assertions are supported only");
  });
});
