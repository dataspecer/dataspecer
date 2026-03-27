import { OutputStream } from "@dataspecer/core/io/stream/output-stream";
import {
  XmlClassMatch,
  XmlContainerMatch,
  XmlMatch,
  xmlMatchIsClass,
  xmlMatchIsCodelist,
  xmlMatchIsContainer,
  xmlMatchIsLiteral,
  XmlRootTemplate,
  XmlTemplate,
  XmlTransformation,
} from "./xslt-model.ts";
import { XmlStreamWriter, XmlWriter } from "../xml/xml-writer.ts";
import { commonXmlNamespace, commonXmlPrefix, iriElementName, QName } from "../conventions.ts";
import { XSLT_LIFTING } from "./xslt-vocabulary.ts";

const xslNamespace = "http://www.w3.org/1999/XSL/Transform";

/**
 * This element will be generated from templates to denote content that should
 * be placed at the top level. This process takes place after
 * the normal templates.
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
  await writer.writeAndRegisterNamespaceDeclaration("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
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
async function writeCommonTemplates(writer: XmlWriter): Promise<void> {
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
          await writer.writeElementFull(
            "xsl",
            "sequence",
          )(async (writer) => {
            await writer.writeElementFull(
              "xsl",
              "call-template",
            )(async (writer) => {
              await writer.writeLocalAttributeValue("name", rootTemplate.targetTemplate);
            });
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

      await writeTemplateContents(template, model, writer);
    });
  }
}

/**
 * Writes out the contents of a named template.
 */
async function writeTemplateContents(template: XmlTemplate, model: XmlTransformation, writer: XmlWriter): Promise<void> {
  const iriElementQName: QName = template.iriElementName ?? [model.targetNamespacePrefix ?? iriElementName[0], iriElementName[1]];

  await writer.writeElementFull(
    "rdf",
    "Description",
  )(async (writer) => {
    await writer.writeElementFull(
      "xsl",
      "apply-templates",
    )(async (writer) => {
      await writer.writeLocalAttributeValue("select", "@*");
    });

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
        )(async (writer) => {
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

          await writer.writeElementFull(
            "xsl",
            "otherwise",
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
      await writeTemplateMatch(match, writer);
    }
  });
}

/**
 * Writes out a property match from a template.
 */
async function writeTemplateMatch(match: XmlMatch, writer: XmlWriter): Promise<void> {
  const qNameElementSelector = (name: QName): string => {
    const [prefix, localName] = name;
    if (prefix == null) {
      return localName;
    }
    return writer.getQName(prefix, localName);
  };

  if (xmlMatchIsContainer(match)) {
    // For containers, match the container element and process inner properties
    await writeContainerMatch(match, writer);
  } else if (xmlMatchIsClass(match) && match.isDematerialized && !match.isAttribute) {
    // Identifying the range of corresponding elements might be useful here.
    await writeProperty(match, writer);
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
async function writeContainerMatch(containerMatch: XmlContainerMatch, writer: XmlWriter): Promise<void> {
  // Containers are structural-only for lifting and should not add iteration.
  for (const innerMatch of containerMatch.innerMatches) {
    await writeTemplateMatch(innerMatch, writer);
  }
}

/**
 * Writes out an RDF/XML property.
 */
async function writeProperty(match: XmlMatch, writer: XmlWriter) {
  if (match.isReverse) {
    if (!xmlMatchIsClass(match)) {
      throw new Error(`Reverse property ${match.propertyName} must be of a class type.`);
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
      await writeClassTemplateCall(match, writer);
    });
  } else {
    await writeForwardProperty(match, writer);
  }
}

/**
 * Writes out an RDF/XML property.
 */
async function writeForwardProperty(match: XmlMatch, writer: XmlWriter) {
  for (const interpretation of match.interpretations) {
    await writer.writeElementFull(...interpretation)(async (writer) => {
      if (xmlMatchIsLiteral(match)) {
        await writer.writeAttributeValue("rdf", "datatype", match.dataTypeIri);

        // Copy xml:lang and the value.
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
      } else if (xmlMatchIsCodelist(match)) {
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
      await writer.writeElementFull(
        "xsl",
        "sequence",
      )(async (writer) => {
        for (const template of templates) {
          await writer.writeElementEmpty(...(await template.typeName));
        }
      });
    });
    await writer.writeElementFull(
      "xsl",
      "choose",
    )(async (writer) => {
      for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
        const typeIndex = templateIndex + 1;
        const targetTemplate = templates[templateIndex];
        const typeSelector = `*[node-name() = node-name($types/*[${typeIndex}])]`;

        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          // Find the QName of the type and compare.
          const condition = `$type=node-name($types/*[${typeIndex}])`;
          await writer.writeLocalAttributeValue("test", condition);
          await writeTemplateCall(targetTemplate.templateName, hasArc, false, writer);
        });

        await writer.writeElementFull(
          "xsl",
          "when",
        )(async (writer) => {
          // Support wrapper elements where xsi:type is on the nested object.
          await writer.writeLocalAttributeValue("test", typeSelector);
          await writer.writeElementFull(
            "xsl",
            "for-each",
          )(async (writer) => {
            await writer.writeLocalAttributeValue("select", typeSelector);
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
