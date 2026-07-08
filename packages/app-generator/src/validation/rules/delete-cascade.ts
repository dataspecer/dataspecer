import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import {
  AssociationKind,
  DeletePolicy,
  Operation,
  type ApplicationNode,
} from '../../graph/types.ts';
import { findMatchingChain, resolveAssociationChain } from '../association-chain.ts';
import { splitFieldPath } from '../field-path.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import type { AggregateMetadata } from '../../metadata/types.ts';

interface MutationNodeAssociations {
  node: ApplicationNode;
  aggregate: AggregateMetadata;
  kinds: Map<string, AssociationKind>;
}

/**
 * A cascade must not contradict how Create and Update nodes of the same class model the association (only compositions
 * can be cascade-deleted). An association left unconfigured on such a node defaults to aggregation, which cannot
 * cascade. When no Create or Update node models the association at all, the cascade is accepted as declared.
 */
export function validateDeleteCascade(context: SemanticValidationContext): Violation[] {
  const violations: Violation[] = [];
  const mutationNodes = collectMutationNodeAssociations(context);

  context.graph.nodes.forEach((node, nodeIndex) => {
    if (node.operation !== Operation.Delete) {
      return;
    }

    const deleteConfig = node.config?.delete;
    if (!deleteConfig) {
      return;
    }

    const aggregate = context.aggregates.get(node.aggregateIri);
    if (!aggregate) {
      return;
    }

    const cascadePaths = new Set(
      Object.entries(deleteConfig)
        .filter(([, policy]) => policy === DeletePolicy.Cascade)
        .map(([path]) => splitFieldPath(path).join('.'))
    );

    Object.entries(deleteConfig).forEach(([path, policy]) => {
      if (policy !== DeletePolicy.Cascade) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticInvalidDeletePolicy,
            `Delete policy for "${path}" must be "cascade".`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      const chain = resolveAssociationChain(aggregate, path);
      if (!chain) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticDeletePathNotAssociation,
            `Delete cascade path "${path}" is not an association on aggregate "${aggregate.name}".`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      for (const mutation of mutationNodes) {
        if (mutation.aggregate.classIri !== aggregate.classIri) {
          continue;
        }
        const matched = findMatchingChain(mutation.aggregate, chain);
        if (!matched) {
          continue;
        }
        const configuredKind = mutation.kinds.get(matched.map((field) => field.path).join('.'));
        if (configuredKind !== AssociationKind.Composition) {
          violations.push(
            semanticViolation(
              ViolationCode.SemanticCannotCascadeAggregation,
              `Delete cascade path "${path}" is not configured as a composition on node "${mutation.node.id}".`,
              `/nodes/${nodeIndex}/config/delete/${path}`
            )
          );
          return;
        }
      }

      const segments = splitFieldPath(path);
      if (segments.length > 1 && !cascadePaths.has(segments.slice(0, -1).join('.'))) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticCascadeRequiresParentCascade,
            `Delete cascade path "${path}" requires its parent composition "${segments
              .slice(0, -1)
              .join('.')}" to cascade as well.`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
      }
    });
  });

  return violations;
}

function collectMutationNodeAssociations(
  context: SemanticValidationContext
): MutationNodeAssociations[] {
  const collected: MutationNodeAssociations[] = [];

  for (const node of context.graph.nodes) {
    if (node.operation !== Operation.Create && node.operation !== Operation.Update) {
      continue;
    }
    const aggregate = context.aggregates.get(node.aggregateIri);
    if (!aggregate) {
      continue;
    }

    const kinds = new Map<string, AssociationKind>();
    for (const [path, kind] of Object.entries(node.config?.associations ?? {})) {
      kinds.set(splitFieldPath(path).join('.'), kind);
    }
    collected.push({ node, aggregate, kinds });
  }

  return collected;
}
