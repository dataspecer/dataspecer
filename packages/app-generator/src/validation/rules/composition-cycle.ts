import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import { AssociationKind } from '../../graph/types.ts';
import { type AggregateFieldMetadata, FieldKind } from '../../metadata/types.ts';
import { compositeKey } from '../../utils/composite-key.ts';

/**
 * Rejects circular compositions across aggregates. Inline composition structures are finite trees
 * by construction because the metadata mapper rejects circular inline structures, so only
 * composition associations that reference another aggregate can form a cycle.
 */
export function validateCompositionCycles(context: SemanticValidationContext): Violation[] {
  const compositionTargets = new Map<string, string[]>();
  for (const aggregate of context.aggregates.values()) {
    const targets: string[] = [];
    collectCompositionTargets(aggregate.fields, targets);
    compositionTargets.set(aggregate.iri, targets.sort());
  }

  const violations: Violation[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  const visit = (aggregateIri: string): void => {
    state.set(aggregateIri, 'visiting');
    stack.push(aggregateIri);

    for (const target of compositionTargets.get(aggregateIri) ?? []) {
      if (!compositionTargets.has(target)) {
        continue;
      }
      const targetState = state.get(target);
      if (targetState === 'visiting') {
        const cycle = stack.slice(stack.indexOf(target));
        const cycleKey = canonicalCycleKey(cycle);
        if (!reportedCycles.has(cycleKey)) {
          reportedCycles.add(cycleKey);
          violations.push(
            semanticViolation(
              ViolationCode.SemanticCircularComposition,
              `Composition cycle detected: ${[...cycle, target].join(' -> ')}. ` +
                'Change at least one association in the cycle to an aggregation.',
              '/nodes'
            )
          );
        }
      } else if (targetState === undefined) {
        visit(target);
      }
    }

    stack.pop();
    state.set(aggregateIri, 'done');
  };

  for (const aggregateIri of [...compositionTargets.keys()].sort()) {
    if (!state.has(aggregateIri)) {
      visit(aggregateIri);
    }
  }

  return violations;
}

function collectCompositionTargets(fields: AggregateFieldMetadata[], into: string[]): void {
  for (const field of fields) {
    if (field.kind !== FieldKind.Association) {
      continue;
    }
    if (field.associationKind === AssociationKind.Composition && field.targetAggregateIri) {
      into.push(field.targetAggregateIri);
    }
    if (field.fields) {
      collectCompositionTargets(field.fields, into);
    }
  }
}

function canonicalCycleKey(cycle: string[]): string {
  // the same cycle can be reached from any member, rotating it to the smallest IRI reports it once
  const minIndex = cycle.indexOf([...cycle].sort()[0]);
  return compositeKey(...cycle.slice(minIndex), ...cycle.slice(0, minIndex));
}
