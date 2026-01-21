import { OutputStream } from "@dataspecer/core/io/stream/output-stream";
import { LanguageString } from "@dataspecer/core/core/core-resource";

import {
  XmlSchema,
  XmlSchemaComplexContent,
  XmlSchemaComplexItem,
  XmlSchemaElement,
  xmlSchemaTypeIsComplex,
  xmlSchemaTypeIsSimple,
  xmlSchemaComplexContentIsElement,
  xmlSchemaComplexContentIsItem,
  XmlSchemaSimpleType,
  XmlSchemaComplexType,
  xmlSchemaComplexTypeDefinitionIsSequence,
  xmlSchemaComplexTypeDefinitionIsChoice,
  xmlSchemaComplexTypeDefinitionIsAll,
  XmlSchemaComplexContainer,
  XmlSchemaAnnotated,
  XmlSchemaType,
  xmlSchemaComplexTypeDefinitionIsExtension,
  xmlSchemaSimpleTypeDefinitionIsRestriction,
  xmlSchemaSimpleTypeDefinitionIsList,
  XmlSchemaAttribute,
  xmlSchemaTypeIsLangString,
} from "./xml-schema-model.ts";

import { XmlWriter, XmlStreamWriter } from "../xml/xml-writer.ts";
import { langStringName } from "../conventions.ts";

const xsNamespace = "http://www.w3.org/2001/XMLSchema";
const xsVerNamespace = "http://www.w3.org/2007/XMLSchema-versioning";

/**
 * Checks if a LanguageString has any non-empty values.
 */
function hasLanguageStringContent(ls: LanguageString | null): boolean {
  if (!ls) return false;
  return Object.values(ls).some(value => value && value.trim().length > 0);
}

/**
 * Writes the full XML Schema to output.
 */
export async function writeXmlSchema(
  model: XmlSchema,
  stream: OutputStream
): Promise<void> {
  const writer = new XmlStreamWriter(stream);
  await writeSchemaBegin(model, writer);
  await writeImportsAndDefinitions(model, writer);
  await writeTypes(model, writer);
  await writeElements(model, writer);
  await writeSchemaEnd(writer);
}

/**
 * Writes the beginning of the schema, including the XML declaration,
 * schema definition and options, and declares used namespaces.
 */
async function writeSchemaBegin(
  model: XmlSchema,
  writer: XmlWriter
): Promise<void> {
  await writer.writeXmlDeclaration("1.0", "utf-8");
  writer.registerNamespace("xs", xsNamespace);
  await writer.writeElementBegin("xs", "schema");
  await writer.writeNamespaceDeclaration("xs", xsNamespace); // This is kept here to make it first in the list - special case.
  await writer.writeAndRegisterNamespaceDeclaration("vc", xsVerNamespace);
  await writer.writeAttributeValue("vc", "minVersion", "1.1");
  if (model.targetNamespace != null) {
    await writer.writeLocalAttributeValue("elementFormDefault", "qualified");
    await writer.writeLocalAttributeValue(
      "targetNamespace",
      model.targetNamespace
    );
  } else {
    await writer.writeLocalAttributeValue("elementFormDefault", "unqualified");
  }

  // Register all (prefix - namespace) in the schema.
  for (const namespace of model.namespaces) {
    if (namespace.prefix === "xs" || namespace.prefix === "vc") {
      // Skip xs and vc as it is already registered few lines above as special case.
      continue;
    }
    await writer.writeAndRegisterNamespaceDeclaration(namespace.prefix, namespace.namespace);
  }
}

/**
 * Writes the end tag of the schema.
 */
async function writeSchemaEnd(writer: XmlWriter): Promise<void> {
  await writer.writeElementEnd("xs", "schema");
}

/**
 * Writes import/include declarations of external schemas, and defines
 * langString if necessary.
 */
async function writeImportsAndDefinitions(
  model: XmlSchema,
  writer: XmlWriter
): Promise<void> {
  if (model.defineLangString) {
    await writer.writeElementFull("xs", "import")(async writer => {
      await writer.writeLocalAttributeValue(
        "namespace",
        writer.getUriForPrefix("xml")
      );
      await writer.writeLocalAttributeValue(
        "schemaLocation",
        "http://www.w3.org/2001/xml.xsd"
      );
    });
  }

  for (const importDeclaration of model.imports) {
    const namespace = importDeclaration.namespace;
    if (namespace == null || namespace === model.targetNamespace) {
      await writer.writeElementFull("xs", "include")(async writer => {
        await writer.writeLocalAttributeValue(
          "schemaLocation",
          importDeclaration.schemaLocation
        );
      });
    } else {
      await writer.writeElementFull("xs", "import")(async writer => {
        await writer.writeLocalAttributeValue(
          "namespace",
          namespace
        );
        await writer.writeLocalAttributeValue(
          "schemaLocation",
          importDeclaration.schemaLocation
        );
      });
    }
  }

  if (model.defineLangString) {
    await writer.writeElementFull("xs", "complexType")(async writer => {
      await writer.writeLocalAttributeValue(
        "name",
        writer.getQName(...langStringName)
      );
      await writer.writeElementFull("xs", "simpleContent")(async writer => {
        await writer.writeElementFull("xs", "extension")(async writer => {
          await writer.writeLocalAttributeValue(
            "base",
            writer.getQName("xs", "string")
          );
          await writer.writeElementFull("xs", "attribute")(async writer => {
            await writer.writeLocalAttributeValue(
              "ref",
              writer.getQName("xml", "lang")
            );
            await writer.writeLocalAttributeValue("use", "required");
          });
        });
      });
    });
  }
}

/**
 * Writes the list of types in the schema.
 */
async function writeTypes(model: XmlSchema, writer: XmlWriter): Promise<void> {
  for (const type of model.types) {
    if (xmlSchemaTypeIsComplex(type)) {
      await writeComplexType(type, writer);
    } else if (xmlSchemaTypeIsSimple(type)) {
      await writeSimpleType(type, writer);
    } else {
      await writeUnrecognizedObject(type, writer);
    }
  }
}

/**
 * Debug function - writes out an object that was not recognized from model.
 */
async function writeUnrecognizedObject(
  object: any,
  writer: XmlWriter
) {
  await writer.writeComment(
    "The following object was not recognized:\n" + JSON.stringify(object)
  );
}
/**
 * Writes out the list of elements in the schema.
 */
async function writeElements(
  model: XmlSchema,
  writer: XmlWriter
): Promise<void> {
  for (const element of model.elements) {
    await writeElement(element, null, writer);
  }
}

/**
 * Writes out an xs:annotation.
 */
async function writeAnnotation(
  annotated: XmlSchemaAnnotated,
  writer: XmlWriter
): Promise<void> {
  const annotation = annotated?.annotation;
  if (annotation != null) {
    if (annotation.modelReference != null && annotation.modelReference.length > 0) {
      await writer.writeAttributeValue(
        "sawsdl", "modelReference", annotation.modelReference.join(" ")
      );
    }
    const hasTitle = hasLanguageStringContent(annotation.metaTitle);
    const hasDescription = hasLanguageStringContent(annotation.metaDescription);
    const hasUsageNote = hasLanguageStringContent(annotation.metaUsageNote);

    if (hasTitle || hasDescription || hasUsageNote) {
      await writer.writeElementFull("xs", "annotation")(async writer => {
        const languages = [...new Set([
          ...Object.keys(annotation.metaTitle ?? {}),
          ...Object.keys(annotation.metaDescription ?? {}),
          ...Object.keys(annotation.metaUsageNote ?? {})
        ])].sort();

        for (const language of languages) {
          // Write title and description in first xs:documentation element
          const title = annotation.metaTitle?.[language];
          const description = annotation.metaDescription?.[language];
          const usageNote = annotation.metaUsageNote?.[language];

          await writer.writeElementFull("xs", "documentation")(async writer => {
            await writer.writeLocalAttributeValue("xml:lang", language);

            let text = "";
            if (title || description) {
              text += `${title ?? ""}${title && description ? " - " : ""}${description ?? ""}\n`;
            }

            if (usageNote) {
              text += `${usageNote}\n`;
            }

            await writer.writeText(text);
          });

        }
      });
    }
  }
}

/**
 * Writes out an xs:element definition.
 */
async function writeElement(
  element: XmlSchemaElement,
  parentContent: XmlSchemaComplexContent | null,
  writer: XmlWriter
): Promise<void> {
  await writer.writeElementFull("xs", "element")(async writer => {
    await writeAttributesForComplexContent(parentContent, writer);
    const name = element.name;
    if (element.type == null) {
      // An element with no type uses ref to its name.
      await writer.writeLocalAttributeValue(
        "ref",
        writer.getQName(...name)
      );
      await writeAnnotation(element, writer);
    } else {
      await writer.writeLocalAttributeValue("name", name[1]);
      const type = element.type;
      if (!xmlSchemaTypeIsComplex(type) && !xmlSchemaTypeIsSimple(type) && !xmlSchemaTypeIsLangString(type)) {
        // The type is specified in the schema, simply use its name.
        await writer.writeLocalAttributeValue(
          "type",
          writer.getQName(...type.name)
        );
        await writeAnnotation(element, writer);
      } else {
        // The type is defined inline.
        await writeAnnotation(element, writer);
        if (xmlSchemaTypeIsComplex(type)) {
          await writeComplexType(type, writer);
        } else if (xmlSchemaTypeIsLangString(type)) {
          await writeLanguageStringType(writer);
        } else if (xmlSchemaTypeIsSimple(type)) {
          await writeSimpleType(type, writer);
        } else {
          await writeUnrecognizedObject(type, writer);
        }
      }
    }
  });
}

async function writeAttribute(
  attribute: XmlSchemaAttribute,
  writer: XmlWriter
): Promise<void> {
  await writer.writeElementFull("xs", "attribute")(async writer => {
    if (attribute.isRequired) {
      await writer.writeLocalAttributeValue("use", "required");
    }
    await writer.writeLocalAttributeValue("name", attribute.name[1]);
    const type = attribute.type;
    if (!xmlSchemaTypeIsComplex(type) && !xmlSchemaTypeIsSimple(type)) {
      // Simple type reference by name
      await writer.writeLocalAttributeValue(
        "type",
        writer.getQName(...type.name)
      );
    } else if (xmlSchemaTypeIsSimple(type)) {
      // Inline simple type definition
      await writeSimpleType(type, writer);
    } else {
      await writeUnrecognizedObject(type, writer);
    }
    await writeAnnotation(attribute, writer);
  });
}

/**
 * Writes attributes and elements for an xs:complexType or an xs:simpleType.
 */
async function writeTypeAttributes(
  type: XmlSchemaType,
  writer: XmlWriter
): Promise<void> {
  if (type.name != null) {
    await writer.writeLocalAttributeValue(
      "name", writer.getQName(...type.name)
    );
  }
  await writeAnnotation(type, writer);
}

/**
 * Writes out an xs:complexType.
 */
async function writeComplexType(
  type: XmlSchemaComplexType,
  writer: XmlWriter
): Promise<void> {
  const definition = type.complexDefinition;
  await writer.writeElementFull("xs", "complexType")(async writer => {
    if (type.mixed) {
      await writer.writeLocalAttributeValue("mixed", "true");
    }
    if (type.abstract) {
      await writer.writeLocalAttributeValue("abstract", "true");
    }
    await writeTypeAttributes(type, writer);
    if (xmlSchemaComplexTypeDefinitionIsExtension(definition)) {
      await writer.writeElementFull("xs", "complexContent")(async writer => {
        await writeComplexContent(definition, null, writer);
      });
    } else {
      await writeComplexContent(definition, null, writer);
    }
    for (const attribute of type.attributes) {
      await writeAttribute(attribute, writer);
    }
  });
}

/**
 * Writes out attributes shared by elements in an xs:complexType.
 */
async function writeAttributesForComplexContent(
  content: XmlSchemaComplexContent | null,
  writer: XmlWriter
): Promise<void> {
  if (content == null) {
    return;
  }
  const cardinalityMin = content.cardinalityMin;
  const cardinalityMax = content.cardinalityMax;
  if (cardinalityMin !== 1) {
    await writer.writeLocalAttributeValue(
      "minOccurs",
      cardinalityMin.toString()
    );
  }
  if (cardinalityMax !== 1) {
    await writer.writeLocalAttributeValue(
      "maxOccurs",
      cardinalityMax?.toString() ?? "unbounded"
    );
  }
}

/**
 * Writes out an aggregate element inside an xs:complexType.
 */
async function writeComplexContent(
  definition: XmlSchemaComplexItem,
  parentContent: XmlSchemaComplexContent | null,
  writer: XmlWriter,
): Promise<void> {
  await writer.writeElementFull("xs", definition.xsType)(async writer => {
    await writeAttributesForComplexContent(parentContent, writer);
    if (
      xmlSchemaComplexTypeDefinitionIsSequence(definition) ||
      xmlSchemaComplexTypeDefinitionIsChoice(definition) ||
      xmlSchemaComplexTypeDefinitionIsAll(definition)
    ) {
      await writeComplexContainer(definition, writer);
    } else if (xmlSchemaComplexTypeDefinitionIsExtension(definition)) {
      await writer.writeLocalAttributeValue(
        "base", writer.getQName(...definition.base)
      );
      await writeComplexContainer(definition, writer);
    } else {
      await writeUnrecognizedObject(definition, writer);
    }
  });
}

/**
 * Writes out individual members of an xs:complexType element.
 */
async function writeComplexContainer(
  definition: XmlSchemaComplexContainer,
  writer: XmlWriter
): Promise<void> {
  for (const content of definition.contents) {
    if (xmlSchemaComplexContentIsElement(content)) {
      await writeElement(content.element, content, writer);
    }
    if (xmlSchemaComplexContentIsItem(content)) {
      await writeComplexContent(content.item, content, writer);
    }
  }
  if (xmlSchemaComplexTypeDefinitionIsSequence(definition)) {
    const xsAny = definition.xsAny;
    if (xsAny) {
      await writer.writeElementFull("xs", "any")(async writer => {
        await writeAttributesForComplexContent(xsAny, writer);
        if (xsAny.processContents !== "strict") { // default value
          await writer.writeLocalAttributeValue("processContents", xsAny.processContents);
        }
        if (xsAny.namespace !== "##any") { // default value
          await writer.writeLocalAttributeValue("namespace", xsAny.namespace);
        }
      });
    }
  }
}

async function writeLanguageStringType(
  writer: XmlWriter
): Promise<void> {
  await writer.writeElementFull("xs", "complexType")(async writer => {
    await writer.writeElementFull("xs", "simpleContent")(async writer => {
      await writer.writeElementFull("xs", "extension")(async writer => {
        await writer.writeLocalAttributeValue(
          "base",
          writer.getQName("xs", "string")
        );
        await writer.writeElementFull("xs", "attribute")(async writer => {
          await writer.writeLocalAttributeValue(
            "ref",
            writer.getQName("xml", "lang")
          );
          await writer.writeLocalAttributeValue("use", "required");
        });
      });
    });
  });
}

/**
 * Writes out an xs:simpleType.
 */
async function writeSimpleType(
  type: XmlSchemaSimpleType,
  writer: XmlWriter
): Promise<void> {
  const definition = type.simpleDefinition;
  const contents = definition.contents;
  await writer.writeElementFull("xs", "simpleType")(async writer => {
    await writeTypeAttributes(type, writer);
    if (definition.xsType != null) {
      await writer.writeElementFull("xs", definition.xsType)(async writer => {
        if (xmlSchemaSimpleTypeDefinitionIsRestriction(definition)) {
          await writer.writeLocalAttributeValue(
            "base", writer.getQName(...definition.base)
          );
          if (definition.pattern != null) {
            await writer.writeElementFull("xs", "pattern")(async writer => await writer.writeLocalAttributeValue("value", definition.pattern));
          }
        } else if (xmlSchemaSimpleTypeDefinitionIsList(definition)) {
          // Handle xs:list
          await writer.writeLocalAttributeValue(
            "itemType", writer.getQName(...definition.itemType)
          );
        } else {
          // In case of xs:union and similar.
          await writer.writeLocalAttributeValue(
            "memberTypes",
            contents.map(name => writer.getQName(...name)).join(" ")
          );
        }
      });
    }
  });
}
