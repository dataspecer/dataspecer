import {
  DataSpecification,
  DataSpecificationArtefact,
} from "@dataspecer/core/data-specification/model";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/generators/generator";

export const XML_COMMON_SCHEMA_GENERATOR = "http://example.com/generator/xml-common-schema" as const;

export class XmlCommonSchemaGenerator implements ArtefactGenerator {
  identifier(): string {
    return XML_COMMON_SCHEMA_GENERATOR;
  }

  async generateToStream(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    output: StreamDictionary
  ) {
    if (artefact.outputPath !== null) {
      const stream = output.writePath(artefact.outputPath);
      // todo read file from filesystem and bundle it
      await stream.write(
        '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" targetNamespace="https://schemas.dataspecer.com/xsd/core/">' + "\n" +
        '  <xs:element name="iri" type="xs:anyURI"/>' + "\n" +
        '</xs:schema>'
      );
      await stream.close();
    }
  }

  async generateToObject() {
    throw new Error("This generator can not generate to object.");
  }

  async generateForDocumentation() {
    // todo not implemented
    return null;
  }
}
