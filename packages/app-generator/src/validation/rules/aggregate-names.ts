import { toModuleName } from '../../utils/naming.ts';
import type { AggregateMetadata } from '../../metadata/types.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';

/**
 * Aggregate names come from human labels and are not unique in Dataspecer. Two aggregates with
 * the same derived module name would silently overwrite each other's generated files, so the
 * collision is rejected before generation.
 */
export function validateAggregateNames(context: SemanticValidationContext): Violation[] {
  const violations: Violation[] = [];
  const firstByModuleName = new Map<string, AggregateMetadata>();

  for (const aggregate of context.aggregates.values()) {
    const moduleName = toModuleName(aggregate.name);
    const first = firstByModuleName.get(moduleName);
    if (!first) {
      firstByModuleName.set(moduleName, aggregate);
      continue;
    }

    violations.push(
      semanticViolation(
        ViolationCode.SemanticDuplicateAggregateName,
        `Aggregates "${first.iri}" and "${aggregate.iri}" both produce module name "${moduleName}". Rename one of the structures in Dataspecer.`,
        '/dataSpecificationIri'
      )
    );
  }

  return violations;
}
