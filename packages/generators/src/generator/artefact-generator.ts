import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import {
  DataSpecification,
  DataSpecificationArtefact,
} from "@dataspecer/core/data-specification/model";
import { ArtefactGeneratorContext } from "./artefact-generator-context.ts";

/**
 * High level generator interface. The generator must not change
 * any of the given models.
 */
export interface ArtefactGenerator {
  identifier(): string;

  /**
   * Generate the content and writes is to the output. This function should
   * call {@link generateToStream} and after that only convert it to stream.
   */
  generateToStream(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    output: StreamDictionary
  ): Promise<void>;

  /**
   * Generate the content object representation and returns it. Design to allow
   * call of a generator from another generator.
   *
   * It this functionality is not supported the function must return null.
   */
  generateToObject(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification
  ): Promise<unknown | null>;

  /**
   * An artefact may be included into a documentation. For example a JsonSchema
   * can be included into Bikeshed documentation. This function is given
   * all the content needed to generate the schema and should return a
   * representation that can be consumed by the documentation. The
   * output representation and callerContext are defined by
   * documentationIdentifier. If the artefact can not be included or given
   * documentation is not supported this function should return null.
   */
  generateForDocumentation(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    documentationIdentifier: string,
    callerContext: unknown
  ): Promise<unknown | null>;
}
