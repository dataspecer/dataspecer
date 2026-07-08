import type { DataPsmAssociationEnd } from '@dataspecer/core/data-psm/model/data-psm-association-end';
import type { DataPsmAttribute } from '@dataspecer/core/data-psm/model/data-psm-attribute';
import type { DataPsmClass } from '@dataspecer/core/data-psm/model/data-psm-class';
import type { DataPsmClassReference } from '@dataspecer/core/data-psm/model/data-psm-class-reference';
import type { DataPsmResource } from '@dataspecer/core/data-psm/model/data-psm-resource';
import type { DataPsmSchema } from '@dataspecer/core/data-psm/model/data-psm-schema';
import type {
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  SemanticModelRelationshipEnd,
} from '@dataspecer/core-v2/semantic-model/concepts';

interface OptionalConceptIris {
  /**
   * Optional metadata produced by profile/vocabulary aggregators.
   *
   * For classes, these are IRIs of source classes represented by the aggregate.
   * For relationship ends, these are IRIs of source relationship ends represented
   * by the aggregate.
   */
  conceptIris?: string[];
}

export interface DataspecerSemanticModelClass extends SemanticModelClass, OptionalConceptIris {}

export interface DataspecerSemanticModelRelationshipEnd
  extends SemanticModelRelationshipEnd, OptionalConceptIris {}

export interface DataspecerSemanticModelRelationship extends SemanticModelRelationship {
  ends: DataspecerSemanticModelRelationshipEnd[];
}

export type DataspecerSemanticEntity =
  | DataspecerSemanticModelClass
  | DataspecerSemanticModelRelationship
  | SemanticModelGeneralization;

export type DataspecerAggregatedSemanticModel = DataspecerSemanticEntity[];

export type DataspecerStructureResource =
  | DataPsmResource
  | DataPsmSchema
  | DataPsmClass
  | DataPsmAttribute
  | DataPsmAssociationEnd
  | DataPsmClassReference;

export interface DataspecerSpecificationSource {
  /**
   * List of semantic model entities. Each entity is either a class, relationship or generalization.
   */
  aggregatedSemanticModel: DataspecerAggregatedSemanticModel;
  /**
   * Array of structure models. Each structure model is an array of resources.
   *
   * Each structure model has one {@link DataPsmSchema} that is the root of the structure model.
   */
  structureModels: DataspecerStructureResource[][];
}

export type DataspecerSpecificationLoader = (
  dataSpecificationIri: string
) => Promise<DataspecerSpecificationSource>;
