import { DataSpecification } from "@dataspecer/core/data-specification/model";
import { ConceptualModel } from "../conceptual-model/index.ts";
import { StructureModel } from "../structure-model/model/index.ts";
import { CoreResourceReader } from "@dataspecer/core/core";
import type { ArtefactGenerator } from "./artefact-generator.ts";

export interface StructureClassLocation {
  readonly specification: DataSpecification;

  readonly structureModel: StructureModel;
}

export interface ArtefactGeneratorContext {
  /**
   * Federated reader for all the data.
   */
  readonly reader: CoreResourceReader;

  /**
   * Conceptual models as loaded based on the specifications.
   */
  readonly conceptualModels: { [iri: string]: ConceptualModel };

  /**
   * Structural models as loaded based on the specifications.
   */
  readonly structureModels: { [iri: string]: StructureModel };

  /**
   * Includes re-used specifications.
   */
  readonly specifications: { [iri: string]: DataSpecification };

  /**
   * @param iri Generator identifier.
   */
  createGenerator(iri: string): Promise<ArtefactGenerator | null>;

  /**
   * For given structure class IRI find its locations. Location is defined
   * by a structure model in which the class is defined. In addition,
   * the owner specification of the model is also returned.
   * This method should be used when working with specification re-use.
   *
   * @param iri Structure class identifier.
   */
  findStructureClass(iri: string): StructureClassLocation | null;
}
