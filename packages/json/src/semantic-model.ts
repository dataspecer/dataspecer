import type { LocalEntityWrapped } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import type { DataSpecification } from "@dataspecer/core/data-specification/model";

interface AggregatedEntities {
  getAggregatedEntities(): Record<string, LocalEntityWrapped>;
}

/**
 * Semantic models attached to the specification by the caller of the
 * generators. They are not part of the specification type itself.
 */
interface WithSemanticModels {
  /**
   * Semantic model of the specification itself.
   */
  semanticModel?: AggregatedEntities;

  /**
   * Semantic models of all packages of the project the specification belongs
   * to, ordered from the outermost package to the nested ones.
   */
  projectSemanticModels?: AggregatedEntities[];
}

/**
 * Aggregated semantic entities available for generating the specification.
 *
 * Each package of the project has its own semantic model. A structure may be
 * interpreted by entities of any of them, for example when it references a
 * structure of another specification, hence they are all taken into account.
 * The model of the generated specification takes precedence.
 */
export function getAggregatedSemanticModel(specification: DataSpecification): Record<string, LocalEntityWrapped> {
  const { semanticModel, projectSemanticModels } = specification as DataSpecification & WithSemanticModels;

  const entities: Record<string, LocalEntityWrapped> = {};
  for (const source of [...(projectSemanticModels ?? []), semanticModel]) {
    Object.assign(entities, source?.getAggregatedEntities());
  }
  return entities;
}
