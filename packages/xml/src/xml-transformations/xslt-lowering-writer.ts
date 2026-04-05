import { OutputStream } from "@dataspecer/core/io/stream/output-stream";
import {
  XmlMatch,
  xmlMatchIsClass,
  xmlMatchIsContainer,
  xmlMatchIsLiteral,
  XmlRootTemplate,
  XmlTemplate,
  XmlTransformation,
} from "./xslt-model.ts";
import { XmlStreamWriter, XmlWriter } from "../xml/xml-writer.ts";
import { commonXmlNamespace, commonXmlPrefix, iriElementName, QName } from "../conventions.ts";
import { XSLT_LOWERING } from "./xslt-vocabulary.ts";

const xslNamespace = "http://www.w3.org/1999/XSL/Transform";

/**
 * Writes out a lowering transformation.
 */
export async function writeXsltLowering(model: XmlTransformation, stream: OutputStream): Promise<void> {
  const writer = new XmlStreamWriter(stream);
  await writeTransformationBegin(model, writer);
  await writeImports(model, writer);
  await writeSettings(writer);
  await writeRootTemplates(model, writer);
  await writeCommonTemplates(writer);
  await writeTemplates(model, writer);
  await writeFinalTemplates(writer);
  await writeTransformationEnd(writer);
}

/**
 * Writes the beginning of the transformation, including the XML declaration,
 * transformation definition and options, and declares used namespaces.
 */
async function writeTransformationBegin(model: XmlTransformation, writer: XmlWriter): Promise<void> {
  await writer.writeXmlDeclaration("1.0", "utf-8");
  writer.registerNamespace("xsl", xslNamespace);
  await writer.writeElementBegin("xsl", "stylesheet");
  await writer.writeNamespaceDeclaration("xsl", xslNamespace);
  await writer.writeAndRegisterNamespaceDeclaration("sp", "http://www.w3.org/2005/sparql-results#");
  await writer.writeAndRegisterNamespaceDeclaration("xsi", "http://www.w3.org/2001/XMLSchema-instance");
  await writer.writeLocalAttributeValue("version", "2.0");

  if (model.targetNamespacePrefix != null) {
    await writer.writeAndRegisterNamespaceDeclaration(model.targetNamespacePrefix, model.targetNamespace);
  }

  if (commonXmlNamespace != null) {
    await writer.writeAndRegisterNamespaceDeclaration(commonXmlPrefix, commonXmlNamespace);
  }

  const registered: Record<string, string> = {};

  for (const importDeclaration of model.imports) {
    const namespace = await importDeclaration.namespace;
    const prefix = await importDeclaration.prefix;
    if (namespace != null && prefix != null) {
      if (registered[prefix] == null) {
        await writer.writeAndRegisterNamespaceDeclaration(prefix, namespace);
        registered[prefix] = namespace;
      } else if (registered[prefix] !== namespace) {
        throw new Error(`Imported namespace prefix "${prefix}:" is used for two ` + `different namespaces, "${registered[prefix]}" and "${namespace}".`);
      }
    }
  }
}

/**
 * Writes the settings and parameters of the transformation.
 */
async function writeSettings(writer: XmlWriter): Promise<void> {
  await writer.writeElementFull(
    "xsl",
    "output",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("method", "xml");
    await writer.writeLocalAttributeValue("version", "1.0");
    await writer.writeLocalAttributeValue("encoding", "utf-8");
    await writer.writeLocalAttributeValue("indent", "yes");
  });

  // The SPARQL variable binding names are configurable if necessary.

  await writer.writeElementFull(
    "xsl",
    "param",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "subj");
    await writer.writeLocalAttributeValue("select", "'s'");
  });

  await writer.writeElementFull(
    "xsl",
    "param",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "pred");
    await writer.writeLocalAttributeValue("select", "'p'");
  });

  await writer.writeElementFull(
    "xsl",
    "param",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "obj");
    await writer.writeLocalAttributeValue("select", "'o'");
  });

  await writer.writeElementFull(
    "xsl",
    "variable",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "type");
    await writer.writeLocalAttributeValue("select", "'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'");
  });

  // The id-key function is applied on contents of variable bindings to
  // produce a string identifier from it, to compare by value
  // with other bindings.
  await writer.writeElementFull(
    "xsl",
    "function",
  )(async (writer) => {
    const name = writer.getQName(commonXmlPrefix, "id-key");
    await writer.writeLocalAttributeValue("name", name);
    await writer.writeElementFull(
      "xsl",
      "param",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "node");
    });
    await writer.writeElementFull(
      "xsl",
      "value-of",
    )(async (writer) => {
      const expression = "concat(namespace-uri($node),'|'," + "local-name($node),'|',string($node))";
      await writer.writeLocalAttributeValue("select", expression);
    });
  });
}

/**
 * Returns a call to id-key using {@link expression}.
 */
function elementIdTest(expression: string, writer: XmlWriter) {
  const name = writer.getQName(commonXmlPrefix, "id-key");
  return `${name}(${expression})`;
}

function iriMatchCondition(bindingExpression: string, iris: string[]): string {
  if (iris.length === 0) {
    return "false()";
  }
  return iris.map((iri) => `${bindingExpression}="${iri}"`).join(" or ");
}

function rootResultSelection(rootTemplate: XmlRootTemplate): string {
  const classCondition = iriMatchCondition("sp:binding[@name=$obj]/sp:uri/text()", rootTemplate.classIris);
  return "sp:results/sp:result[sp:binding[@name=$pred]/sp:uri/text()=$type and " + `${classCondition}]`;
}

function resolveBindings(isReverse: boolean): [string, string] {
  return isReverse ? ["$obj", "$subj"] : ["$subj", "$obj"];
}

function propertyResultPath(subjectBinding: string, propertyIris: string[], writer: XmlWriter): string {
  // Compare identifiers by value (namespace URI + local name + value),
  // because subjects/objects can be represented by different XML nodes.
  return (
    `//sp:result[sp:binding[@name=${subjectBinding}]/*[$id_test = ` +
    elementIdTest(".", writer) +
    `] and ${iriMatchCondition("sp:binding[@name=$pred]/sp:uri/text()", propertyIris)}]`
  );
}

/**
 * Writes the end of the transformation.
 */
async function writeTransformationEnd(writer: XmlWriter): Promise<void> {
  await writer.writeElementEnd("xsl", "stylesheet");
}

/**
 * Writes common templates used from other places.
 */
async function writeCommonTemplates(writer: XmlWriter): Promise<void> {
  // todo only for lang properties
  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    // An xml:lang attribute is copied when encountered.
    await writer.writeLocalAttributeValue("match", "@xml:lang");
    await writer.writeElementFull(
      "xsl",
      "copy-of",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", ".");
    });
  });

  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    // An sp:literal element is converted to its value, including xml:lang.
    await writer.writeLocalAttributeValue("match", "sp:literal");
    await writer.writeElementFull(
      "xsl",
      "apply-templates",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", "@*");
    });
    await writer.writeElementFull(
      "xsl",
      "value-of",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", ".");
    });
  });

  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    // An sp:uri element is converted to its value.
    await writer.writeLocalAttributeValue("match", "sp:uri");
    await writer.writeElementFull(
      "xsl",
      "value-of",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", ".");
    });
  });
}

/**
 * Writes the fallback template.
 */
async function writeFinalTemplates(writer: XmlWriter): Promise<void> {
  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("match", "@*|*");
  });
}

/**
 * Writes the root templates of the transformation.
 */
async function writeRootTemplates(model: XmlTransformation, writer: XmlWriter): Promise<void> {
  const resolveRootElementName = (name: QName): QName => {
    if (name[0] == null && model.targetNamespacePrefix != null) {
      return [model.targetNamespacePrefix, name[1]];
    }
    return name;
  };

  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("match", "/sp:sparql");
    for (const rootTemplate of model.rootTemplates) {
      const select = rootResultSelection(rootTemplate);
      if (rootTemplate.collectionElementName != null) {
        await writer.writeElementFull(...resolveRootElementName(rootTemplate.collectionElementName))(async (writer) => {
          await writer.writeElementFull(
            "xsl",
            "for-each-group",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", select);
            await writer.writeLocalAttributeValue("group-by", elementIdTest("sp:binding[@name=$subj]/*[1]", writer));
            await writer.writeElementFull(
              "xsl",
              "apply-templates",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("select", "current-group()[1]");
            });
          });
        });
      } else {
        await writer.writeElementFull(
          "xsl",
          "for-each-group",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("select", select);
          await writer.writeLocalAttributeValue("group-by", elementIdTest("sp:binding[@name=$subj]/*[1]", writer));
          await writer.writeElementFull(
            "xsl",
            "apply-templates",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "current-group()[1]");
          });
        });
      }
    }
  });

  for (const rootTemplate of model.rootTemplates) {
    await writeRootTemplate(rootTemplate, writer);
  }
}

/**
 * Writes out a root template.
 */
async function writeRootTemplate(rootTemplate: XmlRootTemplate, writer: XmlWriter): Promise<void> {
  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    // Matches a result with rdf:type predicate and the class IRI.
    const match = rootResultSelection(rootTemplate).replace("sp:results/", "");
    await writer.writeLocalAttributeValue("match", match);
    await writer.writeElementFull(...rootTemplate.elementName)(async (writer) => {
      // Call the named template, passing the subject binding as the id.
      await writer.writeElementFull(
        "xsl",
        "call-template",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", rootTemplate.targetTemplate);
        await writer.writeElementFull(
          "xsl",
          "with-param",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("name", "id");
          await writer.writeElementFull(
            "xsl",
            "copy-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "sp:binding[@name=$subj]/*");
          });
        });
      });
    });
  });
}

/**
 * Writes out the named templates in a transformation.
 */
async function writeTemplates(model: XmlTransformation, writer: XmlWriter): Promise<void> {
  for (const template of model.templates) {
    await writer.writeElementFull(
      "xsl",
      "template",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", template.name);

      await writeTemplateContents(template, model, writer);
    });
  }
}

/**
 * Writes out the contents of a named template.
 */
async function writeTemplateContents(template: XmlTemplate, model: XmlTransformation, writer: XmlWriter): Promise<void> {
  const iriElementQName: QName = template.iriElementName ?? [model.targetNamespacePrefix ?? iriElementName[0], iriElementName[1]];
  // Whether the class has interpretation or it is just a structural wrapper having no type, no iri.
  const interpreted = template.classIris.length > 0;

  // The SPARQL binding content containing the identifier of the resource.
  await writer.writeElementFull(
    "xsl",
    "param",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "id");
  });

  // // The value of the xsi:type attribute.
  // await writer.writeElementFull(
  //   "xsl",
  //   "param",
  // )(async (writer) => {
  //   await writer.writeLocalAttributeValue("name", "type_name");
  //   await writer.writeLocalAttributeValue("select", "()");
  // });

  // Do not match <iri>.
  await writer.writeElementFull(
    "xsl",
    "param",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "no_iri");
    await writer.writeLocalAttributeValue("select", "false()");
  });

  // // Add xsi:type if specified.
  // if (interpreted) {
  //   await writer.writeElementFull(
  //     "xsl",
  //     "if",
  //   )(async (writer) => {
  //     await writer.writeLocalAttributeValue("test", "not(empty($type_name))");
  //     await writer.writeElementFull(
  //       "xsl",
  //       "attribute",
  //     )(async (writer) => {
  //       await writer.writeLocalAttributeValue("name", "xsi:type");
  //       await writer.writeElementFull(
  //         "xsl",
  //         "value-of",
  //       )(async (writer) => {
  //         await writer.writeLocalAttributeValue("select", "$type_name");
  //       });
  //     });
  //   });
  // }

  // Converts the identifier to string for testing.
  await writer.writeElementFull(
    "xsl",
    "variable",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", "id_test");
    await writer.writeElementFull(
      "xsl",
      "value-of",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", elementIdTest("$id/*", writer));
    });
  });

  // Write all property attributes first, then elements (attributes must come before elements in XML)
  for (const match of template.propertyMatches) {
    if (!xmlMatchIsContainer(match) && match.isAttribute) {
      await writeTemplateMatch(match, writer);
    }
  }

  // Write out <iri> if the identifier is sp:uri.
  // Keep this after attributes, so no attribute is added after child nodes.
  if (interpreted) {
    await writer.writeElementFull(
      "xsl",
      "if",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("test", "not($no_iri)");
      await writer.writeElementFull(
        "xsl",
        "for-each",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("select", "$id/sp:uri");

        if (model.elementIriAsAttribute) {
          await writer.writeElementFull(
            "xsl",
            "attribute",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", iriElementName[1]);
            await writer.writeElementFull(
              "xsl",
              "value-of",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("select", ".");
            });
          });
        } else {
          await writer.writeElementFull(...iriElementQName)(async (writer) => {
            await writer.writeElementFull(
              "xsl",
              "value-of",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("select", ".");
            });
          });
        }
      });
    });
  }

  // Then write all property elements
  for (const match of template.propertyMatches) {
    if (xmlMatchIsContainer(match) || !match.isAttribute) {
      await writeTemplateMatch(match, writer);
    }
  }
}

/**
 * Writes out a property match from a template.
 *
 * Effectively, this writes single property inside a class. Since all classes
 * are converted to templates, this will effectively either ends with primitive
 * type or call another template.
 */
async function writeTemplateMatch(match: XmlMatch, writer: XmlWriter): Promise<void> {
  if (xmlMatchIsContainer(match)) {
    // We simply iterate the contents of the container
    // For max cardinality of 1, this is OK
    for (const inner of match.innerMatches) {
      await writeTemplateMatch(inner, writer);
    }
  } else {
    const isInterpreted = match.propertyIris.length > 0;
    const [subj, obj] = resolveBindings(match.isReverse);
    if (isInterpreted) {
      // This is for each that iterates all triples
      await writer.writeElementFull(
        "xsl",
        "for-each-group",
      )(async (writer) => {
        const path = propertyResultPath(subj, match.propertyIris, writer);

        await writer.writeLocalAttributeValue("select", path);
        await writer.writeLocalAttributeValue("group-by", elementIdTest(`sp:binding[@name=${obj}]/*[1]`, writer));

        await writer.writeElementFull(
          "xsl",
          "for-each",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("select", "current-group()[1]");
          await writeMatchedProperty(match, obj, writer);
        });
      });
    } else {
      // In case of non-interpreted property, this means that we do not need to
      // do the for-each iteration because there is no need. We inherit the ID
      // from parent.
      await writeMatchedProperty(match, null, writer);
    }
  }
}

async function writeMatchedProperty(match: XmlMatch, obj: string | null, writer: XmlWriter): Promise<void> {
  if (xmlMatchIsClass(match) && match.isDematerialized) {
    // Do not write property tags, only the contents.
    await writePropertyContents(match, obj, writer);
  } else if (match.isAttribute) {
    await writer.writeElementFull(
      "xsl",
      "attribute",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", writer.getQName(...match.propertyName));
      await writePropertyContents(match, obj, writer);
    });
  } else {
    await writer.writeElementFull(...match.propertyName)(async (writer) => { // Here we write property tag
      await writePropertyContents(match, obj, writer);
    });
  }
}

/**
 * Writes out an XML property contents.
 * @property match either string for variable name or null for $id
 */
async function writePropertyContents(match: XmlMatch, obj: string | null, writer: XmlWriter): Promise<void> {
  if (xmlMatchIsLiteral(match)) {
    await writer.writeElementFull(
      "xsl",
      "apply-templates",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", `sp:binding[@name=${obj}]/sp:literal`);
    });
  } else if (xmlMatchIsClass(match)) {
    if (match.isAttribute) {
      throw new Error(`Property ${match.propertyName} cannot be lowered as an XML attribute when its range is a class.`);
    }
    const noIri = match.isDematerialized;
    const templates = match.targetTemplates;
    const objectBinding = obj ? `sp:binding[@name=${obj}]/*` : "$id";
    if (templates.length == 1) {
      await writeTemplateCall(templates[0].templateName, null, noIri, objectBinding, writer);
    } else {
      if (obj === null) {
        throw new Error(`Multiple target templates cannot be used for a property without object binding.`);
      }
      await writer.writeElementFull(
        "xsl",
        "choose",
      )(async (writer) => {
        for (const template of match.targetTemplates) {
          // Test if there is a result with the subject binding matching the
          // current object, and it has rdf:type of the class IRI.
          const condition =
            `//sp:result[sp:binding[@name=$subj]/*[${elementIdTest(".", writer)} = ` +
            elementIdTest(`current()/sp:binding[@name=${obj}]/*`, writer) +
            "] and sp:binding[@name=$pred]/sp:uri/text()=$type and " +
            `${iriMatchCondition("sp:binding[@name=$obj]/sp:uri/text()", template.classIris)}]`;
          await writer.writeElementFull(
            "xsl",
            "when",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("test", condition);
            const typeName = await template.typeName;
            if (typeName != null) {
              // For polymorphic properties emit a concrete wrapper element
              // (e.g., <city_house>...</city_house>) inside the property.
              await writer.writeElementFull(...typeName)(async (writer) => {
                await writeTemplateCall(template.templateName, null, noIri, `sp:binding[@name=${obj}]/*`, writer);
              });
            } else {
              await writeTemplateCall(template.templateName, null, noIri, `sp:binding[@name=${obj}]/*`, writer);
            }
          });
        }
      });
    }
  }
}

/**
 * Writes out a call to a named template.
 * @param templateName The name of the template.
 * @param typeName Set $type_name to the {@link QName} to use for xsi:type.
 * @param noIri Whether to set $no_iri to true.
 * @param obj The object binding, to obtain the identifier.
 * @param writer The XML writer.
 */
async function writeTemplateCall(templateName: string, typeName: /* QName | */ null, noIri: boolean, obj: string, writer: XmlWriter): Promise<void> {
  await writer.writeElementFull(
    "xsl",
    "call-template",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", templateName);
    await writer.writeElementFull(
      "xsl",
      "with-param",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "id");
      await writer.writeElementFull(
        "xsl",
        "copy-of",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("select", obj); // `sp:binding[@name=${obj}]/*`
      });
    });
    if (typeName != null) {
      // await writer.writeElementFull(
      //   "xsl",
      //   "with-param",
      // )(async (writer) => {
      //   await writer.writeLocalAttributeValue("name", "type_name");
      //   const type = writer.getQName(...typeName);
      //   await writer.writeLocalAttributeValue("select", `"${type}"`);
      // });
    }
    if (noIri) {
      await writer.writeElementFull(
        "xsl",
        "with-param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "no_iri");
        await writer.writeLocalAttributeValue("select", "true()");
      });
    }
  });
}

/**
 * Writes out the imports to external lowering transformations.
 */
async function writeImports(model: XmlTransformation, writer: XmlWriter): Promise<void> {
  for (const include of model.imports) {
    const location = include.locations[XSLT_LOWERING.Generator];
    if (location != null) {
      await writer.writeElementFull(
        "xsl",
        "import",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("href", location);
      });
    }
  }
}
