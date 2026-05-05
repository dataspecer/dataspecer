import { OutputStream } from "@dataspecer/core/io/stream/output-stream";
import {
  XmlClassMatch,
  XmlContainerMatch,
  xmlMatchIsGmlLiteral,
  XmlMatch,
  xmlMatchIsClass,
  xmlMatchIsContainer,
  xmlMatchIsIri,
  xmlMatchIsLiteral,
  xmlMatchIsWktLiteral,
  XmlRootTemplate,
  XmlTemplate,
  XmlTransformation,
} from "./xslt-model.ts";
import { XmlStreamWriter, XmlWriter } from "../xml/xml-writer.ts";
import { commonXmlNamespace, commonXmlPrefix, QName } from "../conventions.ts";
import { XSLT_LIFTING } from "./xslt-vocabulary.ts";
import { writePrefixesFromImports } from "./utils.ts";

const xslNamespace = "http://www.w3.org/1999/XSL/Transform";

/**
 * Name of the template that takes contents of a GML literal and emits RDF serialized literal.
 */
const gmlTransformLiftingTemplateName = "gml-transform-lifting";

/**
 * @todo use class to avoid passing the model around everywhere.
 */

/**
 * This element will be generated from templates to denote content that should
 * be placed at the top level. This process takes place after the normal
 * templates.
 *
 * The reason are reverse associations. It is not possible in a simple way to
 * generate the reverse property in rdf.xml. Therefore, for each reverse
 * property range we need to generate new root element and link the domain from
 * it. This element, top-level, is our temporary wrapper for such cases which
 * marks XML subtree to be moved to the root. First we generate almost final
 * rdf.xml with these top-level wrappers and then we process it again to move
 * the content of these wrappers to the root and remove the wrappers.
 *
 * @todo this can be handled directly by generating the root xslt transformation
 * without the need for a top-level wrapper.
 */
const inverseContainer: QName = [null, "top-level"];

/**
 * Writes out a lifting transformation.
 */
export async function writeXsltLifting(model: XmlTransformation, stream: OutputStream): Promise<void> {
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
  await writer.writeAndRegisterNamespaceDeclaration("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  await writer.writeAndRegisterNamespaceDeclaration("xsi", "http://www.w3.org/2001/XMLSchema-instance");
  if (model.usesWktLiterals || model.usesGmlLiterals) {
    await writer.writeAndRegisterNamespaceDeclaration("gsp", "http://www.opengis.net/ont/geosparql#");
  }
  await writer.writeLocalAttributeValue("version", usesVersion3 ? "3.0" : "2.0");

  if (model.targetNamespacePrefix != null) {
    await writer.writeAndRegisterNamespaceDeclaration(model.targetNamespacePrefix, model.targetNamespace);
  }

  if (commonXmlNamespace != null) {
    await writer.writeAndRegisterNamespaceDeclaration(commonXmlPrefix, commonXmlNamespace);
  }

  await writePrefixesFromImports(model.imports, writer);

  for (const prefix of Object.keys(model.rdfNamespaces)) {
    await writer.writeAndRegisterNamespaceDeclaration(prefix, model.rdfNamespaces[prefix]);
  }
}

/**
 * Writes the settings of the transformation.
 */
async function writeSettings(writer: XmlWriter): Promise<void> {
  await writer.writeElementFull(
    "xsl",
    "output",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("method", "xml");
    await writer.writeLocalAttributeValue("version", "1.0");
    await writer.writeLocalAttributeValue("encoding", "utf-8");
    await writer.writeLocalAttributeValue("media-type", "application/rdf+xml");
    await writer.writeLocalAttributeValue("indent", "yes");
  });
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

  // todo only for inverse containers
  await writer.writeElementFull(
    "xsl",
    "template",
  )(async (writer) => {
    // The remove-top template removes all occurrences of inverseContainer.
    await writer.writeLocalAttributeValue("name", "remove-top");

    await writer.writeElementFull(
      "xsl",
      "for-each",
    )(async (writer) => {
      // Attributes are copied.
      await writer.writeLocalAttributeValue("select", "@*");

      await writer.writeElementEmpty("xsl", "copy");
    });

    await writer.writeElementFull(
      "xsl",
      "for-each",
    )(async (writer) => {
      // Any non-inverseContainer element is iterated.
      const path = `node()[not(. instance of element(${writer.getQName(...inverseContainer)}))]`;
      await writer.writeLocalAttributeValue("select", path);

      await writer.writeElementFull(
        "xsl",
        "copy",
      )(async (writer) => {
        // And copied with the template evaluated recursively.
        await writer.writeElementFull(
          "xsl",
          "call-template",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("name", "remove-top");
        });
      });
    });
  });

  if (model.usesWktLiterals) {
    // Template for WKT literal transformation
    // Converts an element with @srsName and WKT content to a single literal
    // in the form "<srsurl> WKT_CONTENT" (datatype gsp:wktLiteral).
    await writer.writeElementFull(
      "xsl",
      "template",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "wkt-transform");
      await writer.writeElementFull(
        "xsl",
        "choose",
      )(async (writer) => {
        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          // Only treat the first token as srs when srsName attribute is present
          await writer.writeLocalAttributeValue("test", "@srsName");
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            // Trim only leading/trailing whitespace from both parts (do not collapse internal spaces)
            // < and > will be properly escaped
            const select = "concat('<', replace(@srsName, '^\\s+|\\s+$',''), '>', ' ', replace(string(.), '^\\s+|\\s+$',''))";
            await writer.writeLocalAttributeValue("select", select);
          });
        });
        await writer.writeElementFull(
          "xsl",
          "otherwise",
        )(async (writer) => {
          // If no srsName attribute, just output the trimmed content
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "replace(string(.), '^\\s+|\\s+$','')");
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
      await writer.writeLocalAttributeValue("name", gmlTransformLiftingTemplateName);
      await writer.writeElementFull(
        "xsl",
        "value-of",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("select", "serialize(node(), map{'method':'xml','omit-xml-declaration':true(),'indent':false()})");
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
  for (const rootTemplate of model.rootTemplates) {
    await writeRootTemplate(model, rootTemplate, writer);
  }
}

/**
 * Writes out a root template.
 */
async function writeRootTemplate(model: XmlTransformation, rootTemplate: XmlRootTemplate, writer: XmlWriter): Promise<void> {
  const qNameElementSelector = (name: QName): string => {
    const [prefix, localName] = name;
    if (prefix == null) {
      return localName;
    }
    return writer.getQName(prefix, localName);
  };

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
    // Matches the single root element or a collection wrapper.
    const match =
      rootTemplate.collectionElementName == null
        ? "/" + qNameElementSelector(rootTemplate.elementName)
        : "/" + qNameElementSelector(resolveRootElementName(rootTemplate.collectionElementName));
    await writer.writeLocalAttributeValue("match", match);

    await writer.writeElementFull(
      "rdf",
      "RDF",
    )(async (writer) => {
      const writeRootBody = async (writer: XmlWriter) => {
        const writeRemoveTopForEach = async (select: string, writer: XmlWriter) => {
          await writer.writeElementFull(
            "xsl",
            "for-each",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", select);

            await writer.writeElementFull(
              "xsl",
              "copy",
            )(async (writer) => {
              await writer.writeElementFull(
                "xsl",
                "call-template",
              )(async (writer) => {
                await writer.writeLocalAttributeValue("name", "remove-top");
              });
            });
          });
        };

        // Stores the result of the target template.
        await writer.writeElementFull(
          "xsl",
          "variable",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("name", "result");
          await writer.writeLocalAttributeValue("as", "element()*");
          await writer.writeElementFull(
            "xsl",
            "call-template",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", rootTemplate.targetTemplate);
          });
        });

        // First emit the main result tree without temporary top-level wrappers.
        await writeRemoveTopForEach("$result", writer);

        // Then emit nodes lifted through inverseContainer into the real top level.
        const inverseContainerNodes = `$result//${writer.getQName(...inverseContainer)}/node()`;
        await writeRemoveTopForEach(inverseContainerNodes, writer);
      };

      if (rootTemplate.collectionElementName == null) {
        await writeRootBody(writer);
      } else {
        await writer.writeElementFull(
          "xsl",
          "for-each",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("select", qNameElementSelector(rootTemplate.elementName));
          await writeRootBody(writer);
        });
      }
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

      // Used for reverse properties to link back to the outer element.
      await writer.writeElementFull(
        "xsl",
        "param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "arc");
        await writer.writeLocalAttributeValue("select", "()");
      });

      // Do not match <iri>.
      await writer.writeElementFull(
        "xsl",
        "param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "no_iri");
        await writer.writeLocalAttributeValue("select", "false()");
      });

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
  const isInterpreted = template.classIris.length > 0;
  /**
   * If emitIdentity is false, it means that the entity is still interpreted,
   * but we want it as a blank node. It still has some blank node IRI!
   */
  const emitIdentity = iriElementQName != null;

  const contents = async (writer: XmlWriter) => {
    await writer.writeElementFull(
      "xsl",
      "apply-templates",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", "@*");
    });

    if (isInterpreted) {

      // The id variable holds the attribute identifying this node, either
      // via rdf:about or rdf:nodeID.
      await writer.writeElementFull(
        "xsl",
        "variable",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "id");
        await writer.writeElementFull(
          null,
          "id",
        )(async (writer) => {
          await writer.writeElementFull(
            "xsl",
            "choose",
            emitIdentity,
          )(async (writer) => {
            if (emitIdentity) {
              await writer.writeElementFull(
                "xsl",
                "when",
              )(async (writer) => {
                const iri = writer.getQName(...iriElementQName);
                const iriPath = model.elementIriAsAttribute ? `@${iri}` : iri;
                const condition = `${iriPath} and not($no_iri)`;
                await writer.writeLocalAttributeValue("test", condition);
                await writer.writeElementFull(
                  "xsl",
                  "attribute",
                )(async (writer) => {
                  // If <iri> is found, use it in rdf:about
                  await writer.writeLocalAttributeValue("name", "rdf:about");
                  await writer.writeElementFull(
                    "xsl",
                    "value-of",
                  )(async (writer) => {
                    await writer.writeLocalAttributeValue("select", iriPath);
                  });
                });
              });
            }

            await writer.writeElementFull(
              "xsl",
              "otherwise",
              emitIdentity,
            )(async (writer) => {
              await writer.writeElementFull(
                "xsl",
                "attribute",
              )(async (writer) => {
                // Otherwise generate an identifier from the current context node.
                await writer.writeLocalAttributeValue("name", "rdf:nodeID");
                await writer.writeElementFull(
                  "xsl",
                  "value-of",
                )(async (writer) => {
                  await writer.writeLocalAttributeValue("select", "generate-id()");
                });
              });
            });
          });
        });
      });

      // Copy the id attribute.
      await writer.writeElementFull(
        "xsl",
        "copy-of",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("select", "$id//@*");
      });

    }

    for (const classIri of template.classIris) {
      // Add all declared rdf:type statements for the resource.
      await writer.writeElementFull(
        "rdf",
        "type",
      )(async (writer) => {
        await writer.writeAttributeValue("rdf", "resource", classIri);
      });
    }

    // If this was constructed from a reverse property, add the arc back.
    await writer.writeElementFull(
      "xsl",
      "copy-of",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", "$arc");
    });

    for (const match of template.propertyMatches) {
      await writeTemplateMatch(match, templateIndex, writer);
    }
  };

  if (isInterpreted) {
    await writer.writeElementFull(
      "rdf",
      "Description",
    )(contents);
  } else {
    await contents(writer);
  }
}

/**
 * Builds an XPath condition that indicates if a match is present in the current
 * XML context. Used for dematerialized classes because we do not want to
 * generate statements for them if they are really not present in the XML. And
 * we cannot check their presence simply because they have no single wrapping
 * element we can target.
 */
function matchPresenceCondition(
  match: XmlMatch,
  templateIndex: Map<string, XmlTemplate>,
  writer: XmlWriter,
  visitedTemplates: Set<string> = new Set<string>(),
): string | null {
  const qNameElementSelector = (name: QName): string => {
    const [prefix, localName] = name;
    if (prefix == null) {
      return localName;
    }
    return writer.getQName(prefix, localName);
  };

  const unique = (items: string[]): string[] => {
    return Array.from(new Set(items));
  };

  if (xmlMatchIsContainer(match)) {
    const innerConditions = unique(
      match.innerMatches
        .map((innerMatch) => matchPresenceCondition(innerMatch, templateIndex, writer, visitedTemplates))
        .filter((condition): condition is string => condition != null && condition.length > 0),
    );
    if (innerConditions.length === 0) {
      return null;
    }
    return innerConditions.length === 1 ? innerConditions[0] : `(${innerConditions.join(" or ")})`;
  }

  if (xmlMatchIsClass(match) && match.isDematerialized && !match.isAttribute) {
    const branchSignals: string[] = [];
    for (const targetTemplate of match.targetTemplates) {
      const nestedTemplate = templateIndex.get(targetTemplate.templateName);
      if (nestedTemplate == null || visitedTemplates.has(nestedTemplate.name)) {
        continue;
      }

      visitedTemplates.add(nestedTemplate.name);
      for (const propertyMatch of nestedTemplate.propertyMatches) {
        const condition = matchPresenceCondition(propertyMatch, templateIndex, writer, visitedTemplates);
        if (condition != null && condition.length > 0) {
          branchSignals.push(condition);
        }
      }
      visitedTemplates.delete(nestedTemplate.name);
    }

    const conditions = unique(branchSignals);
    if (conditions.length === 0) {
      return null;
    }
    return conditions.length === 1 ? conditions[0] : `(${conditions.join(" or ")})`;
  }

  const name = writer.getQName(...match.propertyName);
  const selector = match.isAttribute ? `@${name}` : qNameElementSelector(match.propertyName);
  return `exists(${selector})`;
}

/**
 * Writes out a property match from a template.
 */
async function writeTemplateMatch(
  match: XmlMatch,
  templateIndex: Map<string, XmlTemplate>,
  writer: XmlWriter,
  isInsideChoice: boolean = false,
): Promise<void> {
  const qNameElementSelector = (name: QName): string => {
    const [prefix, localName] = name;
    if (prefix == null) {
      return localName;
    }
    return writer.getQName(prefix, localName);
  };

  if (xmlMatchIsContainer(match)) {
    // For containers, match the container element and process inner properties
    await writeContainerMatch(match, templateIndex, writer, isInsideChoice);
  } else if (xmlMatchIsClass(match) && match.isDematerialized && !match.isAttribute) {
    // For dematerialized classes, we need to check whether the contents of such
    // class is really present in the XML. The reason is that if the CLASS is
    // present, we will generate a blank node for it and we need to know when we
    // can generate the blank node.
    //
    // This is not a problem for other types of structures such as optional
    // containers, because we are simply matching each property individually and
    // generating only one RDF triple.

    const minCardinality = match.minCardinality ?? 1;
    const shouldGuardDematerialized = isInsideChoice || minCardinality === 0;
    if (shouldGuardDematerialized) {
      const condition = matchPresenceCondition(match, templateIndex, writer);
      if (condition != null) {
        await writer.writeElementFull(
          "xsl",
          "if",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("test", condition);
          await writeProperty(match, writer);
        });
      } else {
        await writeProperty(match, writer);
      }
    } else {
      await writeProperty(match, writer);
    }
  } else {
    await writer.writeElementFull(
      "xsl",
      "for-each",
    )(async (writer) => {
      const name = writer.getQName(...match.propertyName);
      const selector = match.isAttribute ? `@${name}` : qNameElementSelector(match.propertyName);
      await writer.writeLocalAttributeValue("select", selector);

      await writeProperty(match, writer);
    });
  }
}

/**
 * Writes out a container match from a template.
 * Containers group related elements (e.g., xs:sequence, xs:choice).
 */
async function writeContainerMatch(
  containerMatch: XmlContainerMatch,
  templateIndex: Map<string, XmlTemplate>,
  writer: XmlWriter,
  isInsideChoice: boolean,
): Promise<void> {
  if (containerMatch.containerType === "choice") {
    // We need to track recursively if we are inside a choice because it affects
    // whether we generate guards for dematerialized classes.
    isInsideChoice = true;
  }

  for (const innerMatch of containerMatch.innerMatches) {
    await writeTemplateMatch(innerMatch, templateIndex, writer, isInsideChoice);
  }
}

/**
 * Writes out an RDF/XML property.
 */
async function writeProperty(match: XmlMatch, writer: XmlWriter) {
  if (match.isReverse) {
    if (!xmlMatchIsClass(match) && !xmlMatchIsIri(match)) {
      throw new Error(`Reverse property ${match.propertyName} must have a class or IRI range.`);
    }

    // Stores the property arc.
    await writer.writeElementFull(
      "xsl",
      "variable",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "arc");
      for (const interpretation of match.interpretations) {
        await writer.writeElementFull(...interpretation)(async (writer) => {
          await writer.writeElementFull(
            "rdf",
            "Description",
          )(async (writer) => {
            await writer.writeElementFull(
              "xsl",
              "copy-of",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("select", "$id//@*");
            });
          });
        });
      }
    });

    // Generates a temporary inverseContainer with the rdf:Description created
    // from the object instance.
    await writer.writeElementFull(...inverseContainer)(async (writer) => {
      if (xmlMatchIsIri(match)) {
        await writer.writeElementFull(
          "rdf",
          "Description",
        )(async (writer) => {
          await writer.writeElementFull(
            "xsl",
            "attribute",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "rdf:about");
            await writer.writeElementFull(
              "xsl",
              "value-of",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("select", ".");
            });
          });

          await writer.writeElementFull(
            "xsl",
            "copy-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", "$arc/*");
          });
        });
      } else {
        await writeClassTemplateCall(match, writer);
      }
    });
  } else {
    await writeForwardProperty(match, writer);
  }
}

/**
 * Writes out an RDF/XML property.
 */
async function writeForwardProperty(match: XmlMatch, writer: XmlWriter) {
  for (const interpretation of match.interpretations) { // If there are no interpretations, then there is no mapping for this primitive property, so it is not lifted.
    await writer.writeElementFull(...interpretation)(async (writer) => {
      if (xmlMatchIsLiteral(match)) {
        await writer.writeAttributeValue("rdf", "datatype", match.dataTypeIri);

        if (xmlMatchIsWktLiteral(match)) {
          // For WKT literals, use the wkt-transform template
          await writer.writeElementFull(
            "xsl",
            "call-template",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", "wkt-transform");
          });
        } else if (xmlMatchIsGmlLiteral(match)) {
          // For GML literals, serialize the current XML node as lexical XML.
          await writer.writeElementFull(
            "xsl",
            "call-template",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("name", gmlTransformLiftingTemplateName);
          });
        } else {
          // Copy xml:lang and the value for regular literals.
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
        }
      } else if (xmlMatchIsIri(match)) {
        await writer.writeElementFull(
          "xsl",
          "attribute",
        )(async (writer) => {
          await writer.writeLocalAttributeValue("name", "rdf:resource");
          await writer.writeElementFull(
            "xsl",
            "value-of",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", ".");
          });
        });
      } else if (xmlMatchIsClass(match)) {
        if (match.isAttribute) {
          throw new Error(`Property ${match.propertyName} cannot be lifted from an XML attribute when its range is a class.`);
        }
        await writeClassTemplateCall(match, writer);
      }
    });
  }
  // If there is no interpretation and it is class, we still continue but without any wrapping because the class is not interpreted but children can be.
  if (match.interpretations.length === 0 && xmlMatchIsClass(match)) {
    if (match.isAttribute) {
      throw new Error(`Property ${match.propertyName} cannot be lifted from an XML attribute when its range is a class.`);
    }
    await writeClassTemplateCall(match, writer);
  }
}

/**
 * Writes out a template call from a class match.
 */
async function writeClassTemplateCall(match: XmlClassMatch, writer: XmlWriter) {
  const templates = match.targetTemplates;
  const hasArc = match.isReverse;
  if (match.isDematerialized) {
    // Just call its templates, but do not look for <iri>.
    for (const template of templates) {
      await writeTemplateCall(template.templateName, hasArc, true, writer);
    }
  } else if (templates.length == 1) {
    await writeTemplateCall(templates[0].templateName, hasArc, false, writer);
  } else {
    // Resolve the QName in xsi:type.
    await writer.writeElementFull(
      "xsl",
      "variable",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "type");
      await writer.writeLocalAttributeValue("select", "resolve-QName(@xsi:type,.)");
    });
    // A virtual "array" of elements is created to store the QNames for each
    // of the types, to compare against the value of xsi:type but use the
    // namespace resolution in XSLT.
    await writer.writeElementFull(
      "xsl",
      "variable",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("name", "types");
      await writer.writeLocalAttributeValue("as", "element()*");
      for (const template of templates) {
        await writer.writeElementEmpty(...(await template.typeName));
      }
    });
    await writer.writeElementFull(
      "xsl",
      "choose",
    )(async (writer) => {
      for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
        const typeIndex = templateIndex + 1;
        const targetTemplate = templates[templateIndex];

        // 1. This branch handles the case when the type is specified on the element via @xsi:type
        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          // Find the QName of the type and compare.
          const condition = `$type=node-name($types[${typeIndex}])`;
          await writer.writeLocalAttributeValue("test", condition);
          await writeTemplateCall(targetTemplate.templateName, hasArc, false, writer);
        });

        // 2. This branch handles the case when the type is specified on a wrapper element via
        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          const condition = `*[node-name(.) = node-name($types[${typeIndex}])]`;
          // Support wrapper elements where xsi:type is on the nested object.
          await writer.writeLocalAttributeValue("test", condition);
          await writer.writeElementFull(
            "xsl",
            "for-each",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", condition);
            await writeTemplateCall(targetTemplate.templateName, hasArc, false, writer);
          });
        });
      }
    });
  }
}

/**
 * Writes out a call to a named template.
 * @param templateName The name of the template.
 * @param hasArc Whether to use the $arc variable as an argument.
 * @param noIri Whether to set $no_iri to true.
 * @param writer The XML writer.
 */
async function writeTemplateCall(templateName: string, hasArc: boolean, noIri: boolean, writer: XmlWriter): Promise<void> {
  await writer.writeElementFull(
    "xsl",
    "call-template",
  )(async (writer) => {
    await writer.writeLocalAttributeValue("name", templateName);
    if (hasArc) {
      await writer.writeElementFull(
        "xsl",
        "with-param",
      )(async (writer) => {
        await writer.writeLocalAttributeValue("name", "arc");
        await writer.writeLocalAttributeValue("select", "$arc");
      });
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
 * Writes out the imports to external lifting transformations.
 */
async function writeImports(model: XmlTransformation, writer: XmlWriter): Promise<void> {
  for (const include of model.imports) {
    const location = include.locations[XSLT_LIFTING.Generator];
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
