import { assertFailed, assertNot } from "@dataspecer/core/core";
import {
  DataSpecification,
  DataSpecificationArtefact,
  DataSpecificationSchema,
} from "@dataspecer/core/data-specification/model";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { defaultStructureTransformations, structureModelTransformCodelists, transformStructureModel } from "@dataspecer/core/structure-model/transformation";
import { structureModelAddXmlProperties } from "../xml-structure-model/add-xml-properties.ts";
import { structureModelToXmlSchema } from "./xml-schema-model-adapter.ts";
import { XML_SCHEMA } from "./xml-schema-vocabulary.ts";
import { writeXmlSchema } from "./xml-schema-writer.ts";
import { HandlebarsAdapter } from "../../../handlebars-adapter/lib/interface.js";
import { XmlSchemaDocumentationGenerator } from "../documentation/xml-schema-documentation.ts";

export const NEW_DOC_GENERATOR = "https://schemas.dataspecer.com/generator/template-artifact";

/**
 * Generates extension schema path based on namespace. This is temporary
 * solution as "artifact" dictates us that we should generate one file, usually
 * schema.xsd. With this method, we can generate additional schemas. The logic
 * is following. The main schema has namespace of the topmost structure.
 * Extension schemas are then for profiled structures with different namespace.
 */
export function getExtensionSchemaPath(originalPath: string, namespacePrefix: string): string {
  const suffix = `.${namespacePrefix ? namespacePrefix + "-" : ""}extension.xsd`;
  if (/\.(xsd|xml)/.test(originalPath)) {
    return originalPath.replace(/\.(xsd|xml)/, suffix);
  } else {
    return originalPath + suffix;
  }
}

export class XmlSchemaGenerator implements ArtefactGenerator {
  identifier(): string {
    return XML_SCHEMA.Generator;
  }

  async generateToStream(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    output: StreamDictionary
  ) {
    const {xmlSchemas} = await this.generateToObject(context, artefact, specification);

    // Write the main schema (base schema or top of the profiling chain)
    const mainStream = output.writePath(artefact.outputPath);
    await writeXmlSchema(xmlSchemas[0], mainStream);
    await mainStream.close();

    // Write extension schemas for profiling chains
    for (let i = 1; i < xmlSchemas.length; i++) {
      const extensionPath = getExtensionSchemaPath(artefact.outputPath, xmlSchemas[i].targetNamespacePrefix);
      const stream = output.writePath(extensionPath);
      await writeXmlSchema(xmlSchemas[i], stream);
      await stream.close();
    }
  }

  async generateToObject(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    generateForDocumentation = false,
  ) {
    if (!DataSpecificationSchema.is(artefact)) {
      assertFailed("Invalid artefact type.");
    }
    const schemaArtefact = artefact as DataSpecificationSchema;
    const conceptualModel = context.conceptualModels[specification.pim];
    assertNot(
      conceptualModel === undefined,
      `Missing conceptual model ${specification.pim}.`
    );
    let model = context.structureModels[schemaArtefact.psm];
    assertNot(
      model === undefined,
      `Missing structure model ${schemaArtefact.psm}.`
    );

    const transformations = defaultStructureTransformations;
    model = transformStructureModel(
      conceptualModel,
      model,
      Object.values(context.specifications),
      null,
      transformations
    );

    model = structureModelTransformCodelists(model);

    const xmlModel = await structureModelAddXmlProperties(
      model, context.reader
    );

    const xmlSchemas = await structureModelToXmlSchema(
      context, specification, schemaArtefact, xmlModel, generateForDocumentation
    );

    return {
      xmlSchemas,
      // Keep backward compatibility: first schema is main, last is extension if profiling
      xmlSchema: xmlSchemas[0],
      conceptualModel,
    };
  }

  async generateForDocumentation(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    documentationIdentifier: string,
    callerContext: unknown
  ): Promise<unknown | null> {
    if (documentationIdentifier === NEW_DOC_GENERATOR) {
      const {artifact: documentationArtefact, partial, adapter} = callerContext as {
        artifact: DataSpecificationArtefact,
        partial: (template: string) => string,
        adapter: HandlebarsAdapter,
      };
      const {xmlSchemas, conceptualModel} = await this.generateToObject(context, artefact, specification, true);
      const documentationSchemaView = xmlSchemas[0]; // We squash them into one

      const generator = new XmlSchemaDocumentationGenerator(
        documentationArtefact, conceptualModel, context, artefact, specification, partial, adapter
      );

      return generator.generateToObject(documentationSchemaView);
    }
    return null;
  }
}
