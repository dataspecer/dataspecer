import { OutputStream } from "@dataspecer/core/io/stream/output-stream";
import {
  XmlMatch,
  xmlMatchIsClass,
  xmlMatchIsContainer,
  xmlMatchIsGmlLiteral,
  xmlMatchIsIri,
  xmlMatchIsLiteral,
  xmlMatchIsWktLiteral,
  XmlRootTemplate,
  XmlTemplate,
  XmlTransformation,
} from "./xslt-model.ts";
import { XmlStreamWriter, XmlWriter } from "../xml/xml-writer.ts";
import { commonXmlNamespace, commonXmlPrefix, QName } from "../conventions.ts";
import { XSLT_LOWERING } from "./xslt-vocabulary.ts";
import { writePrefixesFromImports } from "./utils.ts";

const xslNamespace = "http://www.w3.org/1999/XSL/Transform";

/**
 * Name of the template that takes contents of a GML literal and emits XML nodes.
 */
const gmlTransformLoweringTemplateName = "gml-transform-lowering";

/**
 * Writes out a lowering transformation.
 */
export async function writeXsltLowering(model: XmlTransformation, stream: OutputStream): Promise<void> {
  const writer = new XmlStreamWriter(stream);
  await writeTransformationBegin(model, writer);
  await writeImports(model, writer);
  await writeSettings(writer);
  await writeRootTemplates(model, writer);
  await writeCommonTemplates(model, writer);
  await writeTemplates(model, writer);
  await writeFinalTemplates(writer);
  await writeTransformationEnd(writer);
}

/**
 * Writes the beginning of the transformation, including the XML declaration,
 * transformation definition and options, and declares used namespaces.
 */
async function writeTransformationBegin(model: XmlTransformation, writer: XmlWriter): Promise<void> {
  /**
   * Default is off and individual features may turn this on if they require XSLT 3.0 features.
   */
  let usesVersion3 = false;
  usesVersion3 ||= model.usesGmlLiterals;

  await writer.writeXmlDeclaration("1.0", "utf-8");
  writer.registerNamespace("xsl", xslNamespace);
  await writer.writeElementBegin("xsl", "stylesheet");
  await writer.writeNamespaceDeclaration("xsl", xslNamespace);
  await writer.writeAndRegisterNamespaceDeclaration("sp", "http://www.w3.org/2005/sparql-results#");
  await writer.writeAndRegisterNamespaceDeclaration("xsi", "http://www.w3.org/2001/XMLSchema-instance");
  if (model.usesWktLiterals || model.usesGmlLiterals) {
    await writer.writeAndRegisterNamespaceDeclaration("gsp", "http://www.opengis.net/ont/geosparql#");
  }
  if (model.usesGmlLiterals) {
    await writer.writeAndRegisterNamespaceDeclaration("gml", "http://www.opengis.net/gml/3.2");
  }
  await writer.writeLocalAttributeValue("version", usesVersion3 ? "3.0" : "2.0");

  if (model.targetNamespacePrefix != null) {
    await writer.writeAndRegisterNamespaceDeclaration(model.targetNamespacePrefix, model.targetNamespace);
  }

  if (commonXmlNamespace != null) {
    await writer.writeAndRegisterNamespaceDeclaration(commonXmlPrefix, commonXmlNamespace);
  }

  await writePrefixesFromImports(model.imports, writer);
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
  const condition = iris.map((iri) => `${bindingExpression}="${iri}"`).join(" or ");
  return iris.length === 1 ? condition : `(${condition})`;
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
async function writeCommonTemplates(model: XmlTransformation, writer: XmlWriter): Promise<void> {
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

  if (model.usesWktLiterals) {
    // Template for WKT literal transformation (lowering)
    // Expects a string in the form "<srsurl> WKT_CONTENT" or just "WKT_CONTENT".
    // When called inside an element, this template will add @srsName (if present)
    // and write the WKT content as the element text. Trims leading/trailing whitespace.
    await writer.writeElementFull(
      "xsl",
      "template",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "wkt-transform-lowering");
      await writer.writeElementFull(
        "xsl",
        "param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "value");
      });

      // Trim the input value (only leading/trailing whitespace)
      await writer.writeElementFull(
        "xsl",
        "variable",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "trimmed");
        await writer.writeLocalAttributeValue("select", "replace(string($value), '^\\s+|\\s+$','')");
      });

      await writer.writeElementFull(
        "xsl",
        "choose",
      )(async (writer) => {
        // If the trimmed value starts with '<' we treat the first token as srs
        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("test", "starts-with($trimmed, '<')");

          // srs is the token before the first space, with surrounding <> stripped
          await writer.writeElementFull(
            "xsl",
            "variable",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "srsRaw");
            await writer.writeLocalAttributeValue("select", "substring-before($trimmed, ' ')");
          });

          await writer.writeElementFull(
            "xsl",
            "variable",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "srs");
            await writer.writeLocalAttributeValue("select", "replace($srsRaw, '^<(.*)>$','$1')");
          });

          // write attribute srsName
          await writer.writeElementFull(
            "xsl",
            "attribute",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "srsName");
            await writer.writeElementFull(
              "xsl",
              "value-of",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("select", "$srs");
            });
          });

          // write WKT content (rest after first space), trimmed
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "replace(substring-after($trimmed, ' '), '^\\s+|\\s+$','')");
          });
        });

        // If it does not start with '<', treat the whole trimmed value as WKT content
        await writer.writeElementFull(
          "xsl",
          "otherwise",
        )(async (writer) => {
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "$trimmed");
          });
        });
      });
    });
  }

  if (model.usesGmlLiterals) {
    await writer.writeElementFull(
      "xsl",
      "template",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", gmlTransformLoweringTemplateName);
      await writer.writeElementFull(
        "xsl",
        "param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "value");
      });

      await writer.writeElementFull(
        "xsl",
        "param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "wrapper-name");
        await writer.writeLocalAttributeValue("select", "''");
      });

      await writer.writeElementFull(
        "xsl",
        "choose",
      )(async (writer) => {
        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("test", "normalize-space($wrapper-name) != ''");

          await writer.writeElementFull(
            "xsl",
            "variable",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "fragment");
            await writer.writeLocalAttributeValue("select", "parse-xml-fragment(concat('<wrapper>', string($value), '</wrapper>'))/*/*[1]");
          });

          await writer.writeElementFull(
            "xsl",
            "copy-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "$fragment/@*");
          });

          await writer.writeElementFull(
            "xsl",
            "copy-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "$fragment/node()");
          });
        });

        await writer.writeElementFull(
          "xsl",
          "otherwise",
        )(async (writer) => {
          await writer.writeElementFull(
            "xsl",
            "variable",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "fragment");
            await writer.writeLocalAttributeValue("select", "parse-xml-fragment(concat('<wrapper>', string($value), '</wrapper>'))/*/node()");
          });

          await writer.writeElementFull(
            "xsl",
            "copy-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "$fragment");
          });
        });
      });
    });
  }
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
  const templateIndex = new Map<string, XmlTemplate>(
    model.templates.map((template) => [template.name, template]),
  );

  for (const template of model.templates) {
    await writer.writeElementFull(
      "xsl",
      "template",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", template.name);

      await writeTemplateContents(template, model, templateIndex, writer);
    });
  }
}

/**
 * Writes out the contents of a named template.
 */
async function writeTemplateContents(
  template: XmlTemplate,
  model: XmlTransformation,
  templateIndex: Map<string, XmlTemplate>,
  writer: XmlWriter,
): Promise<void> {
  const iriElementQName = template.iriElementName;
  // Whether the class has interpretation or it is just a structural wrapper having no type, no iri.
  const interpreted = template.classIris.length > 0;
  const emitIdentity = iriElementQName != null;

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
      await writeTemplateMatch(match, templateIndex, writer);
    }
  }

  // Write out <iri> if the identifier is sp:uri.
  // Keep this after attributes, so no attribute is added after child nodes.
  if (interpreted && emitIdentity) {
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
            await writer.writeLocalAttributeValue("name", iriElementQName[1]);
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
      await writeTemplateMatch(match, templateIndex, writer);
    }
  }
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

/**
 * Builds a condition that is true when at least one RDF triple backing
 * the given match is present for the current $id.
 */
function matchHasRdfContentCondition(
  match: XmlMatch,
  templateIndex: Map<string, XmlTemplate>,
  writer: XmlWriter,
  visitedTemplates: Set<string> = new Set<string>(),
): string | null {
  if (xmlMatchIsContainer(match)) {
    const innerConditions = unique(
      match.innerMatches
        .map((inner) => matchHasRdfContentCondition(inner, templateIndex, writer, visitedTemplates))
        .filter((condition): condition is string => condition != null && condition.length > 0),
    );
    if (innerConditions.length === 0) {
      return null;
    }
    return innerConditions.length === 1 ? innerConditions[0] : `(${innerConditions.join(" or ")})`;
  }

  if (xmlMatchIsClass(match) && match.propertyIris.length === 0) {
    const nestedConditions: string[] = [];
    for (const targetTemplate of match.targetTemplates) {
      const nestedTemplate = templateIndex.get(targetTemplate.templateName);
      if (nestedTemplate == null || visitedTemplates.has(nestedTemplate.name)) {
        continue;
      }

      visitedTemplates.add(nestedTemplate.name);
      for (const propertyMatch of nestedTemplate.propertyMatches) {
        const condition = matchHasRdfContentCondition(propertyMatch, templateIndex, writer, visitedTemplates);
        if (condition != null && condition.length > 0) {
          nestedConditions.push(condition);
        }
      }
      visitedTemplates.delete(nestedTemplate.name);
    }

    const conditions = unique(nestedConditions);
    if (conditions.length === 0) {
      return null;
    }
    return conditions.length === 1 ? conditions[0] : `(${conditions.join(" or ")})`;
  }

  if (match.propertyIris.length === 0) {
    return null;
  }

  const [subj] = resolveBindings(match.isReverse);
  const path = propertyResultPath(subj, match.propertyIris, writer);
  return `exists(${path})`;
}

/**
 * Writes out a property match from a template.
 *
 * Effectively, this writes single property inside a class. Since all classes
 * are converted to templates, this will effectively either ends with primitive
 * type or call another template.
 */
async function writeTemplateMatch(
  match: XmlMatch,
  templateIndex: Map<string, XmlTemplate>,
  writer: XmlWriter,
  isOptionalContext: boolean = false,
): Promise<void> {
  if (xmlMatchIsContainer(match)) {
    const minCardinality = match.minCardinality;
    const nestedOptionalContext = isOptionalContext || minCardinality === 0 || match.containerType === "choice";

    // Containers are structural, optionality is propagated to inner matches.
    for (const inner of match.innerMatches) {
      await writeTemplateMatch(inner, templateIndex, writer, nestedOptionalContext);
    }
  } else {
    const isInterpreted = match.propertyIris.length > 0;
    const minCardinality = match.minCardinality;
    const isOptional = isOptionalContext || minCardinality === 0;
    const isOptionalNonInterpretedAssociation = xmlMatchIsClass(match) && !isInterpreted && isOptional;

    if (isOptionalNonInterpretedAssociation) {
      // For non-interpreted associations with optional cardinality, we need to
      // decide whether to generate the wrapper element for the property. We
      // want to do it iff there is at least one RDF triple for the property,
      // otherwise we would generate empty elements for non-present optional
      // associations.
      //
      // This is case only for non-interpreted associations as nothing else
      // requires a wrapper element we directly know nothing about.

      const condition = matchHasRdfContentCondition(match, templateIndex, writer);
      if (condition == null) {
        return;
      }

      await writer.writeElementFull(
        "xsl",
        "if",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("test", condition);
        await writeMatchedProperty(match, null, writer);
      });
      return;
    }

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
    if (xmlMatchIsWktLiteral(match)) {
      // For WKT literals, extract the text content and pass to wkt-transform-lowering template
      await writer.writeElementFull(
        "xsl",
        "call-template",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "wkt-transform-lowering");
        await writer.writeElementFull(
          "xsl",
          "with-param",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("name", "value");
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", `sp:binding[@name=${obj}]/sp:literal`);
          });
        });
      });
    } else if (xmlMatchIsGmlLiteral(match)) {
      // For GML literals, parse the serialized XML string and emit XML nodes.
      await writer.writeElementFull(
        "xsl",
        "call-template",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", gmlTransformLoweringTemplateName);
        await writer.writeElementFull(
          "xsl",
          "with-param",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("name", "value");
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", `sp:binding[@name=${obj}]/sp:literal`);
          });
        });
        if (match.wrappingElementName != null) {
          await writer.writeElementFull(
            "xsl",
            "with-param",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "wrapper-name");
            await writer.writeLocalAttributeValue("select", `'${writer.getQName(...match.wrappingElementName)}'`);
          });
        }
      });
    } else {
      // For regular literals, apply templates
      await writer.writeElementFull(
        "xsl",
        "apply-templates",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("select", `sp:binding[@name=${obj}]/sp:literal`);
      });
    }
  } else if (xmlMatchIsIri(match)) {
    await writer.writeElementFull(
      "xsl",
      "apply-templates",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", `sp:binding[@name=${obj}]/sp:uri`);
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
